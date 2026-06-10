-- Part 2-1 追加差分
-- 既存schema.sqlを使っている場合、このファイルの実行は必須ではありません。
-- 今後の拡張に備えて、トレーニング履歴を残したい場合のみ実行してください。

create table if not exists training_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  monster_id uuid not null references monsters(id) on delete cascade,
  training_type text not null check (
    training_type in ('power', 'stamina', 'speed', 'technique')
  ),
  gained_amount integer default 1,
  created_at timestamp with time zone default now()
);

alter table training_logs enable row level security;

create policy "training_logs parent manage"
on training_logs for all
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
