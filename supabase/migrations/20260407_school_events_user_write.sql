alter table public.school_events
  alter column school_id drop not null;

alter table public.school_events
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

alter table public.school_events
  alter column created_by set default auth.uid();

drop policy if exists "Assigned instructors can insert school events" on public.school_events;
create policy "Assigned instructors or creators can insert school events"
on public.school_events
for insert
to authenticated
with check (
  school_events.created_by = auth.uid()
  or exists (
    select 1
    from public.school_instructor_assignments as sia
    where sia.school_id = school_events.school_id
      and sia.user_id = auth.uid()
  )
);

drop policy if exists "Assigned instructors can update school events" on public.school_events;
create policy "Assigned instructors or creators can update school events"
on public.school_events
for update
to authenticated
using (
  school_events.created_by = auth.uid()
  or exists (
    select 1
    from public.school_instructor_assignments as sia
    where sia.school_id = school_events.school_id
      and sia.user_id = auth.uid()
  )
)
with check (
  school_events.created_by = auth.uid()
  or exists (
    select 1
    from public.school_instructor_assignments as sia
    where sia.school_id = school_events.school_id
      and sia.user_id = auth.uid()
  )
);

drop policy if exists "Assigned instructors can delete school events" on public.school_events;
create policy "Assigned instructors or creators can delete school events"
on public.school_events
for delete
to authenticated
using (
  school_events.created_by = auth.uid()
  or exists (
    select 1
    from public.school_instructor_assignments as sia
    where sia.school_id = school_events.school_id
      and sia.user_id = auth.uid()
  )
);
