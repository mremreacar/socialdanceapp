create table if not exists public.instructor_lesson_attendees (
  lesson_id uuid not null references public.instructor_lessons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lesson_id, user_id)
);

create index if not exists instructor_lesson_attendees_lesson_idx
  on public.instructor_lesson_attendees (lesson_id);

create index if not exists instructor_lesson_attendees_user_idx
  on public.instructor_lesson_attendees (user_id);

alter table public.instructor_lesson_attendees enable row level security;

drop policy if exists "Instructor lesson attendees are readable by authenticated users" on public.instructor_lesson_attendees;
create policy "Instructor lesson attendees are readable by authenticated users"
on public.instructor_lesson_attendees
for select
to authenticated
using (true);

drop policy if exists "Users can join published lessons as themselves" on public.instructor_lesson_attendees;
create policy "Users can join published lessons as themselves"
on public.instructor_lesson_attendees
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.instructor_lessons l
    where l.id = instructor_lesson_attendees.lesson_id
      and l.is_published = true
      and exists (
        select 1
        from public.instructor_profiles p
        where p.user_id = l.instructor_user_id
          and p.is_visible = true
      )
  )
);

drop policy if exists "Users can leave lesson reservations as themselves" on public.instructor_lesson_attendees;
create policy "Users can leave lesson reservations as themselves"
on public.instructor_lesson_attendees
for delete
to authenticated
using (auth.uid() = user_id);
