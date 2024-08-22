create or replace function start_timer_for_game() returns trigger as $$
declare
  job_name text;
  sql_command TEXT;
begin
  if old.mode = 'time-based' and old.status = 'open' and new.status = 'progress' then
    sql_command := format(
        'select cron.schedule(%L, %L, %L);',
        'timer:' || OLD.id,
        '33 seconds', -- 30 second game + 3 second countdown
        'select end_game(''' || OLD.id || '''::uuid);'
    );
    execute sql_command;
    return new;
  elsif old.mode = 'time-based' and old.status = 'progress' and new.status = 'open' then
    job_name := 'timer:' || old.id;
    perform cron.unschedule(job_name);
    return new;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop policy if exists "Update rooms for authenticated" on "public"."rooms";
create policy "Update rooms for authenticated" on "public"."rooms" as permissive for update to authenticated using (true);