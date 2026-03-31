create table if not exists public.school_event_attendees (
  event_id uuid not null references public.school_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, user_id)
);

create index if not exists school_event_attendees_event_idx
  on public.school_event_attendees (event_id);

create index if not exists school_event_attendees_user_idx
  on public.school_event_attendees (user_id);

alter table public.school_event_attendees enable row level security;

drop policy if exists "School event attendees are readable by authenticated users" on public.school_event_attendees;
create policy "School event attendees are readable by authenticated users"
on public.school_event_attendees
for select
to authenticated
using (true);

drop policy if exists "Users can join events as themselves" on public.school_event_attendees;
create policy "Users can join events as themselves"
on public.school_event_attendees
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can leave events as themselves" on public.school_event_attendees;
create policy "Users can leave events as themselves"
on public.school_event_attendees
for delete
to authenticated
using (auth.uid() = user_id);

-- Test verisi: "test" baslikli etkinliklere katilimci ekle (idempotent)
insert into public.school_event_attendees (event_id, user_id)
select e.id, p.id
from public.school_events e
cross join lateral (
  select id
  from public.profiles
  order by created_at desc nulls last, id
  limit 6
) p
where e.title ilike '%test%'
on conflict (event_id, user_id) do nothing;
