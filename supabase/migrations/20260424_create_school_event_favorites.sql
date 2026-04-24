create table if not exists public.school_event_favorites (
  user_id uuid not null default auth.uid(),
  event_id uuid not null references public.school_events (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),

  constraint school_event_favorites_pkey primary key (user_id, event_id)
);

alter table public.school_event_favorites enable row level security;

drop policy if exists "Users can read their school event favorites" on public.school_event_favorites;
create policy "Users can read their school event favorites"
on public.school_event_favorites
for select
using (auth.uid() = user_id);

drop policy if exists "Users can add their school event favorites" on public.school_event_favorites;
create policy "Users can add their school event favorites"
on public.school_event_favorites
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their school event favorites" on public.school_event_favorites;
create policy "Users can remove their school event favorites"
on public.school_event_favorites
for delete
using (auth.uid() = user_id);

drop policy if exists "Service role can manage school event favorites" on public.school_event_favorites;
create policy "Service role can manage school event favorites"
on public.school_event_favorites
for all
to service_role
using (true)
with check (true);
