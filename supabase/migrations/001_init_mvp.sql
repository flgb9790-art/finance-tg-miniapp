create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  username text,
  first_name text,
  last_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.currencies (
  code text primary key,
  name text not null,
  symbol text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.exchange_rates (
  base_currency_code text not null references public.currencies(code),
  quote_currency_code text not null references public.currencies(code),
  rate numeric(20, 8) not null check (rate > 0),
  updated_at timestamptz not null default now(),
  primary key (base_currency_code, quote_currency_code),
  check (base_currency_code <> quote_currency_code)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'card', 'crypto', 'savings', 'other')),
  currency_code text not null references public.currencies(code),
  balance numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(18, 2) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  note text,
  photo_url text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  from_amount numeric(18, 2) not null check (from_amount > 0),
  to_amount numeric(18, 2) not null check (to_amount > 0),
  from_currency_code text not null references public.currencies(code),
  to_currency_code text not null references public.currencies(code),
  rate numeric(20, 8) check (rate > 0),
  note text,
  photo_url text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_categories_user_id_kind on public.categories(user_id, kind);
create index if not exists idx_entries_user_id_occurred_at on public.entries(user_id, occurred_at desc);
create index if not exists idx_transfers_user_id_occurred_at on public.transfers(user_id, occurred_at desc);

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
before update on public.accounts
for each row
execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

insert into public.currencies (code, name, symbol)
values
  ('USD', 'US Dollar', '$'),
  ('EUR', 'Euro', 'EUR'),
  ('RUB', 'Russian Ruble', 'RUB'),
  ('GEL', 'Georgian Lari', 'GEL')
on conflict (code) do nothing;
