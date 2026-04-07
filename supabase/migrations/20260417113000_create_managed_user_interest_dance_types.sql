create table if not exists public.managed_user_interest_dance_types (
  user_id uuid not null references public.profiles (id) on delete cascade,
  dance_type_id uuid not null references public.dance_types (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, dance_type_id)
);

create index if not exists managed_user_interest_dance_types_user_idx
  on public.managed_user_interest_dance_types (user_id);

create index if not exists managed_user_interest_dance_types_dance_type_idx
  on public.managed_user_interest_dance_types (dance_type_id);

insert into public.managed_user_interest_dance_types (user_id, dance_type_id)
select distinct
  p.id,
  dt.id
from public.profiles p
cross join lateral unnest(coalesce(p.favorite_dances, '{}'::text[])) as legacy_favorite(value)
join public.dance_types dt
  on dt.id::text = btrim(legacy_favorite.value)
  or lower(btrim(dt.name)) = lower(btrim(legacy_favorite.value))
on conflict (user_id, dance_type_id) do nothing;

alter table public.managed_user_interest_dance_types enable row level security;

drop policy if exists "Managed user interest dance types readable" on public.managed_user_interest_dance_types;
create policy "Managed user interest dance types readable"
on public.managed_user_interest_dance_types
for select
to authenticated
using (true);

drop policy if exists "Users insert own managed user interest dance types" on public.managed_user_interest_dance_types;
create policy "Users insert own managed user interest dance types"
on public.managed_user_interest_dance_types
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own managed user interest dance types" on public.managed_user_interest_dance_types;
create policy "Users update own managed user interest dance types"
on public.managed_user_interest_dance_types
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own managed user interest dance types" on public.managed_user_interest_dance_types;
create policy "Users delete own managed user interest dance types"
on public.managed_user_interest_dance_types
for delete
to authenticated
using (auth.uid() = user_id);
