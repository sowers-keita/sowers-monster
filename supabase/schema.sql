create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null,
  created_at timestamp with time zone default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('parent', 'coach', 'admin')),
  created_at timestamp with time zone default now()
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  classroom_id uuid references classrooms(id),
  created_at timestamp with time zone default now()
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  theme text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists monsters (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  season_id uuid references seasons(id),
  name text not null,
  egg_color text not null check (egg_color in ('red', 'blue', 'pink')),
  stage text not null,
  power integer default 0,
  power_max integer default 10,
  stamina integer default 0,
  stamina_max integer default 10,
  speed integer default 0,
  speed_max integer default 10,
  technique integer default 0,
  technique_max integer default 10,
  battle_power integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists seeds (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  seed_type text not null check (
    seed_type in ('power', 'stamina', 'speed', 'technique', 'all', 'rainbow')
  ),
  count integer default 0,
  unique(child_id, seed_type)
);

create table if not exists qr_codes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id),
  classroom_id uuid references classrooms(id),
  seed_type text not null check (
    seed_type in ('power', 'stamina', 'speed', 'technique', 'all', 'rainbow')
  ),
  amount integer not null,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists qr_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  qr_code_id uuid not null references qr_codes(id) on delete cascade,
  scanned_at timestamp with time zone default now(),
  unique(child_id, qr_code_id)
);

create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  child_id uuid references children(id) on delete cascade,
  mission_type text not null check (mission_type in ('hq', 'parent')),
  title text not null,
  description text,
  reward_seed_type text not null check (
    reward_seed_type in ('power', 'stamina', 'speed', 'technique', 'all', 'rainbow')
  ),
  reward_amount integer default 1,
  mission_date date not null,
  created_at timestamp with time zone default now()
);

create table if not exists mission_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  mission_id uuid not null references missions(id) on delete cascade,
  completed_at timestamp with time zone default now(),
  unique(child_id, mission_id)
);

create table if not exists battles (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  opponent_monster_id uuid references monsters(id),
  result text not null check (result in ('win', 'lose')),
  gained_battle_power integer not null,
  created_at timestamp with time zone default now()
);

create table if not exists zukan (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  monster_name text not null,
  monster_type text not null,
  stage text not null,
  season_id uuid references seasons(id),
  registered_at timestamp with time zone default now()
);

create table if not exists partner_history (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  monster_name text not null,
  days_raised integer default 0,
  battle_power integer default 0,
  win_count integer default 0,
  season_id uuid references seasons(id),
  departed_at timestamp with time zone default now()
);

insert into classrooms (name, type)
values
  ('徳島体操', '体操教室'),
  ('北島教室', '体操教室'),
  ('阿南教室', '体操教室'),
  ('吉野川教室', '体操教室'),
  ('Sowers Club', 'Sowers Club')
on conflict (name) do nothing;
