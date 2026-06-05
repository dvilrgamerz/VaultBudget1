-- VaultBudget normalized Supabase backend.
-- Run this once in Supabase SQL editor if you recreate the backend.

create table if not exists public.vault_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  balance numeric not null default 0,
  member_since date,
  transaction_count integer not null default 0,
  goal_count integer not null default 0,
  recurring_expense_count integer not null default 0,
  last_saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Vault user',
  avatar text not null default '👤',
  member_since date,
  spending_streak integer not null default 0,
  streak_record integer not null default 0,
  setup_complete boolean not null default false,
  income_amount numeric not null default 0,
  income_method text not null default 'Direct deposit',
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  currency text not null default 'USD',
  language text not null default 'English',
  low_balance_threshold numeric not null default 100,
  daily_limit numeric not null default 40,
  daily_reminders boolean not null default true,
  weekly_summaries boolean not null default true,
  over_budget_popup boolean not null default true,
  pay_cycle text not null default 'bi-weekly',
  auto_reset_budget boolean not null default true,
  pin_lock boolean not null default false,
  hide_balance boolean not null default false,
  auto_lock_timer text not null default '5 min',
  auto_export boolean not null default false,
  cloud_sync_mode text not null default 'manual' check (cloud_sync_mode = 'manual'),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense', 'goal')),
  amount numeric not null default 0,
  category text not null default 'Other',
  emoji text,
  note text,
  date_time timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.vault_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  emoji text,
  target_amount numeric not null default 0,
  saved_amount numeric not null default 0,
  target_date date,
  paused boolean not null default false,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.vault_recurring_expenses (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  emoji text,
  name text not null,
  amount numeric not null default 0,
  cadence text not null default 'Monthly',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.vault_states drop column if exists data;
alter table public.vault_states add column if not exists recurring_expense_count integer not null default 0;
alter table public.vault_profiles drop column if exists cloud_email;
alter table public.vault_settings add column if not exists cloud_sync_mode text not null default 'manual';
update public.vault_settings set cloud_sync_mode = 'manual' where cloud_sync_mode is distinct from 'manual';
alter table public.vault_settings alter column cloud_sync_mode set default 'manual';
alter table public.vault_settings drop constraint if exists vault_settings_cloud_sync_mode_check;
alter table public.vault_settings add constraint vault_settings_cloud_sync_mode_check check (cloud_sync_mode = 'manual');

create index if not exists vault_states_last_saved_at_idx on public.vault_states (last_saved_at desc);
create index if not exists vault_transactions_user_date_idx on public.vault_transactions (user_id, date_time desc);
create index if not exists vault_goals_user_target_idx on public.vault_goals (user_id, target_date);

grant usage on schema public to anon, authenticated;

revoke all on table public.vault_states from anon;
revoke all on table public.vault_profiles from anon;
revoke all on table public.vault_settings from anon;
revoke all on table public.vault_transactions from anon;
revoke all on table public.vault_goals from anon;
revoke all on table public.vault_recurring_expenses from anon;
grant select on table public.vault_states to anon;

revoke all on table public.vault_states from authenticated;
revoke all on table public.vault_profiles from authenticated;
revoke all on table public.vault_settings from authenticated;
revoke all on table public.vault_transactions from authenticated;
revoke all on table public.vault_goals from authenticated;
revoke all on table public.vault_recurring_expenses from authenticated;
grant select, insert, update, delete on table public.vault_states to authenticated;
grant select, insert, update, delete on table public.vault_profiles to authenticated;
grant select, insert, update, delete on table public.vault_settings to authenticated;
grant select, insert, update, delete on table public.vault_transactions to authenticated;
grant select, insert, update, delete on table public.vault_goals to authenticated;
grant select, insert, update, delete on table public.vault_recurring_expenses to authenticated;

alter table public.vault_states enable row level security;
alter table public.vault_profiles enable row level security;
alter table public.vault_settings enable row level security;
alter table public.vault_transactions enable row level security;
alter table public.vault_goals enable row level security;
alter table public.vault_recurring_expenses enable row level security;

drop policy if exists "Users can read their own VaultBudget state" on public.vault_states;
drop policy if exists "Users can insert their own VaultBudget state" on public.vault_states;
drop policy if exists "Users can update their own VaultBudget state" on public.vault_states;

drop policy if exists "Users own rows" on public.vault_states;
create policy "Users own rows" on public.vault_states
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users own rows" on public.vault_profiles;
create policy "Users own rows" on public.vault_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users own rows" on public.vault_settings;
create policy "Users own rows" on public.vault_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users own rows" on public.vault_transactions;
create policy "Users own rows" on public.vault_transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users own rows" on public.vault_goals;
create policy "Users own rows" on public.vault_goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users own rows" on public.vault_recurring_expenses;
create policy "Users own rows" on public.vault_recurring_expenses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
