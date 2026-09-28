-- Run once in the Supabase SQL editor as the project owner.
-- The client gets only a publishable key; RLS isolates every user's records.

create table if not exists public.atlas_fields (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null check (char_length(place_id) between 1 and 130),
  -- The companion field at place_id 'profile:mindy' stores her global look.
  field text not null check (field in ('visited','petal_0','petal_1','petal_2','choice','companion')),
  value jsonb check (octet_length(value::text) <= 8000),
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id, field)
);

create table if not exists public.atlas_diary (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 80),
  place_id text not null check (char_length(place_id) between 1 and 130),
  title text not null default '' check (char_length(title) <= 100),
  body text not null default '' check (char_length(body) <= 20000),
  entry_date timestamptz not null default now(),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.atlas_custom_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 130),
  city text not null check (char_length(city) <= 48),
  country text not null check (char_length(country) <= 48),
  region text not null check (region in ('Africa','The Americas','Europe','Caucasus','Southeast Asia','East Asia','Silk Road')),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.atlas_fields enable row level security;
alter table public.atlas_diary enable row level security;
alter table public.atlas_custom_places enable row level security;

revoke all on public.atlas_fields, public.atlas_diary, public.atlas_custom_places from anon;
grant select, insert, update, delete on public.atlas_fields, public.atlas_diary, public.atlas_custom_places to authenticated;

create policy atlas_fields_select on public.atlas_fields for select to authenticated using ((select auth.uid()) = user_id);
create policy atlas_fields_insert on public.atlas_fields for insert to authenticated with check ((select auth.uid()) = user_id);
create policy atlas_fields_update on public.atlas_fields for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy atlas_fields_delete on public.atlas_fields for delete to authenticated using ((select auth.uid()) = user_id);

create policy atlas_diary_select on public.atlas_diary for select to authenticated using ((select auth.uid()) = user_id);
create policy atlas_diary_insert on public.atlas_diary for insert to authenticated with check ((select auth.uid()) = user_id);
create policy atlas_diary_update on public.atlas_diary for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy atlas_diary_delete on public.atlas_diary for delete to authenticated using ((select auth.uid()) = user_id);

create policy atlas_places_select on public.atlas_custom_places for select to authenticated using ((select auth.uid()) = user_id);
create policy atlas_places_insert on public.atlas_custom_places for insert to authenticated with check ((select auth.uid()) = user_id);
create policy atlas_places_update on public.atlas_custom_places for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy atlas_places_delete on public.atlas_custom_places for delete to authenticated using ((select auth.uid()) = user_id);

-- The SQL editor creates this function as postgres. Never expose a service key
-- in web code. A signed-in caller may delete only the auth user in their JWT;
-- the three tables above cascade-delete their records.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := (select auth.uid());
begin
  if caller_id is null then raise exception 'Sign in required'; end if;
  delete from auth.users where id = caller_id;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
