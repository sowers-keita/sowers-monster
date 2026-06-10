alter table profiles enable row level security;
alter table children enable row level security;
alter table classrooms enable row level security;
alter table seasons enable row level security;
alter table monsters enable row level security;
alter table seeds enable row level security;
alter table qr_codes enable row level security;
alter table qr_logs enable row level security;
alter table missions enable row level security;
alter table mission_logs enable row level security;
alter table battles enable row level security;
alter table zukan enable row level security;
alter table partner_history enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$ language sql security definer;

create or replace function is_coach()
returns boolean as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'coach'
  );
$$ language sql security definer;

create policy "profiles select own or admin"
on profiles for select
using (id = auth.uid() or is_admin());

create policy "profiles insert own"
on profiles for insert
with check (id = auth.uid());

create policy "profiles admin manage"
on profiles for all
using (is_admin())
with check (is_admin());

create policy "children parent select"
on children for select
using (parent_id = auth.uid() or is_admin());

create policy "children parent insert"
on children for insert
with check (parent_id = auth.uid() or is_admin());

create policy "children parent update"
on children for update
using (parent_id = auth.uid() or is_admin())
with check (parent_id = auth.uid() or is_admin());

create policy "classrooms read all"
on classrooms for select
using (true);

create policy "classrooms admin manage"
on classrooms for all
using (is_admin())
with check (is_admin());

create policy "seasons read all"
on seasons for select
using (true);

create policy "seasons admin manage"
on seasons for all
using (is_admin())
with check (is_admin());

create policy "monsters parent select"
on monsters for select
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "monsters parent insert"
on monsters for insert
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "monsters parent update"
on monsters for update
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
)
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "seeds parent manage"
on seeds for all
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
)
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "qr_codes coach insert"
on qr_codes for insert
with check (coach_id = auth.uid() or is_admin());

create policy "qr_codes coach select"
on qr_codes for select
using (coach_id = auth.uid() or is_admin());

create policy "qr_logs parent insert"
on qr_logs for insert
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "qr_logs parent select"
on qr_logs for select
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "missions read own or hq"
on missions for select
using (
  mission_type = 'hq'
  or child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "missions parent insert own"
on missions for insert
with check (
  (
    mission_type = 'parent'
    and child_id in (
      select id from children where parent_id = auth.uid()
    )
  )
  or is_admin()
);

create policy "missions parent update own"
on missions for update
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
)
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "mission_logs parent manage"
on mission_logs for all
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
)
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "battles parent manage"
on battles for all
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
)
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "zukan parent select"
on zukan for select
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "zukan parent insert"
on zukan for insert
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "partner_history parent select"
on partner_history for select
using (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);

create policy "partner_history parent insert"
on partner_history for insert
with check (
  child_id in (
    select id from children where parent_id = auth.uid()
  )
  or is_admin()
);
