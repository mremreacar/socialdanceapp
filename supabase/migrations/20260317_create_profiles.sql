create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  username text not null default '',
  avatar_url text,
  bio text not null default '',
  favorite_dances text[] not null default '{}'::text[],
  other_interests text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_username_idx on public.profiles (username);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    username,
    avatar_url,
    bio,
    favorite_dances,
    other_interests
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'displayName', ''),
    coalesce(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'avatarUrl', ''),
    coalesce(new.raw_user_meta_data ->> 'bio', ''),
    coalesce(
      array(
        select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'favoriteDances', '[]'::jsonb))
      ),
      '{}'::text[]
    ),
    coalesce(new.raw_user_meta_data ->> 'otherInterests', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  display_name,
  username,
  avatar_url,
  bio,
  favorite_dances,
  other_interests
)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'displayName', ''),
  coalesce(users.raw_user_meta_data ->> 'username', ''),
  nullif(users.raw_user_meta_data ->> 'avatarUrl', ''),
  coalesce(users.raw_user_meta_data ->> 'bio', ''),
  coalesce(
    array(
      select jsonb_array_elements_text(coalesce(users.raw_user_meta_data -> 'favoriteDances', '[]'::jsonb))
    ),
    '{}'::text[]
  ),
  coalesce(users.raw_user_meta_data ->> 'otherInterests', '')
from auth.users as users
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
