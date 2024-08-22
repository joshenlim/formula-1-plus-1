--- Tables
create table "public"."profiles" (
  "id" uuid not null references "auth"."users"(id) primary key,
  "username" text,
  "games_won" int8 default 0,
  "games_played" int8 default 0,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);
comment on table "public"."profiles" is 'Public profile for each player signed up on the app';
alter table "public"."profiles" enable row level security;

create type "public"."game_type" as enum ('private', 'public');
create type "public"."game_mode" as enum ('time-based', 'fastest-first');
create table "public"."games" (
    "id" uuid not null default gen_random_uuid() primary key,
    "type" game_type not null,
    "mode" game_mode not null,
    "player" uuid not null references "public"."profiles"(id),
    "correct" int8 not null default 0,
    "wrong" int8 not null default 0,
    "times" _int8 not null default array[]::int8[],
    "mistakes" jsonb not null default '{}'::jsonb,
    "configuration" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);
comment on table "public"."games" is 'Games hosted on the app';
alter table "public"."games" enable row level security;

create type "public"."room_status" as enum ('open', 'progress', 'ended');
create table "public"."rooms" (
    "id" uuid not null default gen_random_uuid() primary key,
    "owner" uuid not null references "public"."profiles"(id),
    "mode" game_mode not null,
    "status" room_status not null default 'open',
    "configuration" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);
comment on table "public"."rooms" is 'Games hosted on the app that can be joined by multiple players';
alter table "public"."rooms" enable row level security;

create table "public"."room_players" (
  "room_id" uuid not null references "public"."rooms"(id),
  "player_id" uuid not null references "public"."profiles"(id),
  "is_owner" boolean not null default 'false',
  "is_ready" boolean not null default 'false',
  primary key ("room_id", "player_id")
);
comment on table "public"."room_players" is 'Tracks who are in each room';
alter table "public"."room_players" enable row level security;

--- RLS Policies
create policy "Select profiles for authenticated" on "public"."profiles" as permissive for select to authenticated using (true);
create policy "Insert profiles for authenticated" on "public"."profiles" as permissive for insert to authenticated with check (true);
create policy "Update profiles for users based on user_id" on "public"."profiles" as permissive for update to public using ((select auth.uid()) = id);

create policy "Authenticated users can only see their own private games" on "public"."games" as permissive for select to authenticated using (auth.uid() = player);
create policy "Authenticated users can save results of private games" on "public"."games" as permissive for insert to authenticated with check (true);

create policy "Select rooms for authenticated" on "public"."rooms" as permissive for select to public using (true);
create policy "Insert rooms for authenticated" on "public"."rooms" as permissive for insert to authenticated with check (true);
create policy "Update rooms for authenticated" on "public"."rooms" as permissive for update to authenticated using ((select auth.uid() = owner));
create policy "Delete rooms for room owner" on "public"."rooms" as permissive for delete to authenticated using ((select auth.uid() = owner));

create policy "Select room players for authenticated" on "public"."room_players" as permissive for select to public using (true);
create policy "Insert room players for authenticated" on "public"."room_players" as permissive for insert to authenticated with check (true);
create policy "Update room player status for authenticated" on "public"."room_players" as permissive for update to authenticated using ((select auth.uid() = player_id) or is_owner = true);
create policy "Delete room player for authenticated" on "public"."room_players" as permissive for delete to authenticated using ((select auth.uid() = player_id));

--- Triggers
create or replace function create_profile() returns trigger as $$
begin
  insert into "public"."profiles" (id, username) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger create_profile_for_new_users 
after insert on "auth"."users" for each row 
execute procedure create_profile();

create or replace function check_and_delete_empty_room() returns trigger as $$
declare
  player_count int;
begin
  select count(*) from room_players into player_count where room_id = old.room_id;
  if player_count = 0 then
    delete from "public"."rooms" where id = old.room_id;
    return new;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger delete_empty_rooms
after delete on "public"."room_players" for each row
execute procedure check_and_delete_empty_room();

create or replace function end_game(rid uuid) returns void as $$
declare
  job_name text;
begin
  update "public"."rooms" set status = 'ended' where id = rid;
  job_name := 'timer:' || rid;
  perform cron.unschedule(job_name);
end;
$$ language plpgsql security definer;

create or replace function start_timer_for_game() returns trigger as $$
declare
  job_name text;
  sql_command TEXT;
begin
  if old.status = 'open' and new.status = 'progress' then
    sql_command := format(
        'select cron.schedule(%L, %L, %L);',
        'timer:' || OLD.id,
        '33 seconds', -- 30 second game + 3 second countdown
        'select end_game(''' || OLD.id || '''::uuid);'
    );
    execute sql_command;
    return new;
  elsif old.status = 'progress' and new.status = 'open' then
    job_name := 'timer:' || old.id;
    perform cron.unschedule(job_name);
    return new;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger end_game_after_30_seconds
after update on "public"."rooms" for each row
execute procedure start_timer_for_game();

--- Realtime
alter publication supabase_realtime add table room_players, rooms;

--- Required extensions
create extension pg_cron with schema pg_catalog;