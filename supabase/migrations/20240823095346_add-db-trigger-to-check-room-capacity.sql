create or replace function check_if_room_is_full() returns trigger as $$
declare
  player_count int;
  room_capacity int;
begin
  select capacity from rooms into room_capacity where id = new.room_id;
  select count(*) from room_players into player_count where room_id = new.room_id;
  if player_count >= room_capacity then
    RAISE EXCEPTION 'Room is also at max capacity, join another room instead.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger check_room_capacity
before insert on "public"."room_players" for each row
execute procedure check_if_room_is_full();

create
or replace function get_rooms_available_to_join () returns table (room uuid) as $$
begin
  return query (SELECT r.id AS rooms
FROM rooms r
LEFT JOIN room_players rp ON r.id = rp.room_id
GROUP BY r.id, r.capacity
HAVING COUNT(rp.player_id) < r.capacity);
end;
$$ language plpgsql security definer;