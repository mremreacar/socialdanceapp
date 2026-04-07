create table if not exists public.dance_star_votes (
  voter_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.school_events (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (voter_id, event_id),
  constraint dance_star_votes_no_self_vote check (voter_id <> target_id)
);

create index if not exists dance_star_votes_event_idx on public.dance_star_votes (event_id);
create index if not exists dance_star_votes_target_idx on public.dance_star_votes (target_id);

create or replace function public.set_dance_star_votes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_dance_star_votes_updated_at on public.dance_star_votes;
create trigger set_dance_star_votes_updated_at
before update on public.dance_star_votes
for each row
execute function public.set_dance_star_votes_updated_at();

alter table public.dance_star_votes enable row level security;

drop policy if exists "Users can read own dance star votes" on public.dance_star_votes;
create policy "Users can read own dance star votes"
on public.dance_star_votes
for select
to authenticated
using (auth.uid() = voter_id);

drop policy if exists "Users can insert own dance star votes" on public.dance_star_votes;
create policy "Users can insert own dance star votes"
on public.dance_star_votes
for insert
to authenticated
with check (auth.uid() = voter_id and voter_id <> target_id);

drop policy if exists "Users can update own dance star votes" on public.dance_star_votes;
create policy "Users can update own dance star votes"
on public.dance_star_votes
for update
to authenticated
using (auth.uid() = voter_id)
with check (auth.uid() = voter_id and voter_id <> target_id);

drop policy if exists "Users can delete own dance star votes" on public.dance_star_votes;
create policy "Users can delete own dance star votes"
on public.dance_star_votes
for delete
to authenticated
using (auth.uid() = voter_id);
