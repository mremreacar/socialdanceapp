create table if not exists public.instructor_teaching_dance_types (
  user_id uuid not null references public.instructor_profiles (user_id) on delete cascade,
  dance_type_id uuid not null references public.dance_types (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, dance_type_id)
);

create index if not exists instructor_teaching_dance_types_user_idx
  on public.instructor_teaching_dance_types (user_id);

create index if not exists instructor_teaching_dance_types_dance_type_idx
  on public.instructor_teaching_dance_types (dance_type_id);

insert into public.instructor_teaching_dance_types (user_id, dance_type_id)
select distinct
  p.user_id,
  dt.id
from public.instructor_profiles p
cross join lateral unnest(coalesce(p.specialties, '{}'::text[])) as legacy_specialty(value)
join public.dance_types dt
  on dt.id::text = btrim(legacy_specialty.value)
  or lower(btrim(dt.name)) = lower(btrim(legacy_specialty.value))
on conflict (user_id, dance_type_id) do nothing;

alter table public.instructor_teaching_dance_types enable row level security;

drop policy if exists "Instructor teaching dance types readable" on public.instructor_teaching_dance_types;
create policy "Instructor teaching dance types readable"
on public.instructor_teaching_dance_types
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.instructor_profiles p
    where p.user_id = instructor_teaching_dance_types.user_id
      and p.is_visible = true
  )
);

drop policy if exists "Users insert own instructor teaching dance types" on public.instructor_teaching_dance_types;
create policy "Users insert own instructor teaching dance types"
on public.instructor_teaching_dance_types
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own instructor teaching dance types" on public.instructor_teaching_dance_types;
create policy "Users update own instructor teaching dance types"
on public.instructor_teaching_dance_types
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own instructor teaching dance types" on public.instructor_teaching_dance_types;
create policy "Users delete own instructor teaching dance types"
on public.instructor_teaching_dance_types
for delete
to authenticated
using (auth.uid() = user_id);
