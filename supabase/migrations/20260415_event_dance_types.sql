create table if not exists public.event_dance_types (
  event_id uuid not null references public.school_events (id) on delete cascade,
  dance_type_id uuid not null references public.dance_types (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, dance_type_id)
);

create index if not exists event_dance_types_dance_type_idx
  on public.event_dance_types (dance_type_id);

alter table public.event_dance_types enable row level security;

drop policy if exists "Event dance types are readable by everyone" on public.event_dance_types;
create policy "Event dance types are readable by everyone"
on public.event_dance_types
for select
using (true);

drop policy if exists "Creators or assigned instructors can insert event dance types" on public.event_dance_types;
create policy "Creators or assigned instructors can insert event dance types"
on public.event_dance_types
for insert
to authenticated
with check (
  exists (
    select 1
    from public.school_events as e
    where e.id = event_dance_types.event_id
      and (
        e.created_by = auth.uid()
        or exists (
          select 1
          from public.school_instructor_assignments as sia
          where sia.school_id = e.school_id
            and sia.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Creators or assigned instructors can delete event dance types" on public.event_dance_types;
create policy "Creators or assigned instructors can delete event dance types"
on public.event_dance_types
for delete
to authenticated
using (
  exists (
    select 1
    from public.school_events as e
    where e.id = event_dance_types.event_id
      and (
        e.created_by = auth.uid()
        or exists (
          select 1
          from public.school_instructor_assignments as sia
          where sia.school_id = e.school_id
            and sia.user_id = auth.uid()
        )
      )
  )
);

notify pgrst, 'reload schema';
