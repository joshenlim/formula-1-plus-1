--- Tables
create type "public"."game_status" as enum ('open', 'progress', 'ended');
create table "public"."games" (
    "id" uuid not null default gen_random_uuid() primary key,
    "status" game_status not null default 'open',
    "created_at" timestamp with time zone not null default now(),

    "start_time" timestamp with time zone,
    "text_id" bigint,
    "finishing_times" jsonb,
    "players" uuid[] not null,
    "player_active" jsonb not null,
    "heartbeat" jsonb
);
comment on table "public"."games" is 'Games hosted on the app';
alter table "public"."games" enable row level security;

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

--- RLS Policies
create policy "Select games for authenticated" on "public"."games" as permissive for select to public using (true);
create policy "Insert games for authenticated" on "public"."games" as permissive for insert to authenticated with check (true);

create policy "Select profiles for authenticated" on "public"."profiles" as permissive for select to authenticated using (true);
create policy "Insert profiles for authenticated" on "public"."profiles" as permissive for insert to authenticated with check (true);
create policy "Update profiles for users based on user_id" on "public"."profiles" as permissive for update to public using ((select auth.uid()) = id);