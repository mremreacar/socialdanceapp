create or replace function public.user_manages_school(p_user_id uuid, p_school_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_has_assignment boolean := false;
  v_has_owner boolean := false;
  v_has_instructor boolean := false;
begin
  if p_user_id is null or p_school_id is null then
    return false;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'school_instructor_assignments'
  ) then
    select exists (
      select 1
      from public.school_instructor_assignments
      where user_id = p_user_id
        and school_id = p_school_id
    )
    into v_has_assignment;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'school_owners'
  ) then
    execute $sql$
      select exists (
        select 1
        from public.school_owners
        where user_id = $1
          and school_id = $2
      )
    $sql$
    into v_has_owner
    using p_user_id, p_school_id;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'school_instructors'
  ) then
    execute $sql$
      select exists (
        select 1
        from public.school_instructors
        where user_id = $1
          and school_id = $2
      )
    $sql$
    into v_has_instructor
    using p_user_id, p_school_id;
  end if;

  return v_has_assignment or v_has_owner or v_has_instructor;
end;
$$;

revoke all on function public.user_manages_school(uuid, uuid) from public;
grant execute on function public.user_manages_school(uuid, uuid) to authenticated, anon;

alter table public.school_events
  add column if not exists publish_status text not null default 'approved',
  add column if not exists published_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles (id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles (id) on delete set null,
  add column if not exists rejection_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'school_events_publish_status_check'
      and conrelid = 'public.school_events'::regclass
  ) then
    alter table public.school_events
      add constraint school_events_publish_status_check
      check (publish_status in ('pending', 'approved', 'rejected'));
  end if;
end;
$$;

update public.school_events
set
  publish_status = case
    when coalesce(trim(publish_status), '') in ('pending', 'approved', 'rejected') then trim(publish_status)
    else 'approved'
  end,
  published_at = coalesce(published_at, created_at),
  approved_at = coalesce(approved_at, created_at)
where true;

create table if not exists public.event_publish_permissions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by_school_id uuid references public.schools (id) on delete set null,
  granted_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_event_publish_permissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_event_publish_permissions_updated_at on public.event_publish_permissions;
create trigger set_event_publish_permissions_updated_at
before update on public.event_publish_permissions
for each row
execute function public.set_event_publish_permissions_updated_at();

alter table public.event_publish_permissions enable row level security;

drop policy if exists "Users read own event publish permission" on public.event_publish_permissions;
create policy "Users read own event publish permission"
on public.event_publish_permissions
for select
to authenticated
using (
  auth.uid() = user_id
  or public.user_manages_school(auth.uid(), granted_by_school_id)
);

drop policy if exists "School managers insert event publish permission" on public.event_publish_permissions;
create policy "School managers insert event publish permission"
on public.event_publish_permissions
for insert
to authenticated
with check (
  public.user_manages_school(auth.uid(), granted_by_school_id)
);

drop policy if exists "School managers update event publish permission" on public.event_publish_permissions;
create policy "School managers update event publish permission"
on public.event_publish_permissions
for update
to authenticated
using (
  public.user_manages_school(auth.uid(), granted_by_school_id)
)
with check (
  public.user_manages_school(auth.uid(), granted_by_school_id)
);

drop policy if exists "School managers delete event publish permission" on public.event_publish_permissions;
create policy "School managers delete event publish permission"
on public.event_publish_permissions
for delete
to authenticated
using (
  public.user_manages_school(auth.uid(), granted_by_school_id)
);

create or replace function public.apply_school_event_initial_publication_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid := coalesce(new.created_by, auth.uid());
  v_can_publish boolean := false;
  v_now timestamptz := timezone('utc', now());
begin
  new.created_by := v_creator_id;

  select exists (
    select 1
    from public.event_publish_permissions epp
    where epp.user_id = v_creator_id
  )
  into v_can_publish;

  if v_can_publish then
    new.publish_status := 'approved';
    new.published_at := coalesce(new.published_at, v_now);
    new.approved_at := coalesce(new.approved_at, v_now);
    new.approved_by := coalesce(new.approved_by, v_creator_id);
    new.rejected_at := null;
    new.rejected_by := null;
    new.rejection_reason := null;
  else
    new.publish_status := 'pending';
    new.published_at := null;
    new.approved_at := null;
    new.approved_by := null;
    new.rejected_at := null;
    new.rejected_by := null;
    new.rejection_reason := null;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_school_event_initial_publication_state on public.school_events;
create trigger apply_school_event_initial_publication_state
before insert on public.school_events
for each row
execute function public.apply_school_event_initial_publication_state();

drop policy if exists "School events are readable by everyone" on public.school_events;
drop policy if exists "Approved school events are readable by everyone" on public.school_events;
create policy "Approved school events are readable by everyone"
on public.school_events
for select
using (publish_status = 'approved');

drop policy if exists "Creators and managers read unpublished school events" on public.school_events;
create policy "Creators and managers read unpublished school events"
on public.school_events
for select
to authenticated
using (
  created_by = auth.uid()
  or public.user_manages_school(auth.uid(), school_id)
);
