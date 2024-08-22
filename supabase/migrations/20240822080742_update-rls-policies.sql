drop policy if exists "Update room player status for authenticated" on "public"."room_players";
create policy "Update room player status for authenticated" on "public"."room_players" as permissive
for update
  to authenticated using (
    (
      select
        auth.uid () = player_id
    )
    or (
      select
        is_owner
      from
        room_players
      where
        player_id = auth.uid ()
    )
  );

drop policy if exists "Delete room player for authenticated" on "public"."room_players";
create policy "Delete room player for authenticated" on "public"."room_players" as permissive for delete to authenticated using (
  (
    (
      select
        auth.uid ()
    ) = player_id
  )
  or (
    select
      is_owner
    from
      room_players
    where
      player_id = auth.uid ()
  )
);

create or replace function check_and_delete_empty_room() returns trigger as $$
declare
  player_count int;
begin
  select count(*) from room_players into player_count where room_id = old.room_id;
  if player_count = 0 then
    delete from "public"."rooms" where id = old.room_id;
    return new;
  elsif old.is_owner then
    update "public"."room_players" set is_owner = true where player_id = (select player_id from "public"."room_players" where is_owner = false limit 1);
    return new;
  end if;
  return new;
end;
$$ language plpgsql security definer;