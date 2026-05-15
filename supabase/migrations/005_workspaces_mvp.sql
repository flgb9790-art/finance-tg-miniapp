-- Teams MVP: workspaces, members, invites; ledger scoped by workspace_id.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('personal', 'team')),
  name text not null default 'Личный',
  owner_user_id uuid not null references public.app_users(id) on delete restrict,
  max_members int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'personal' and max_members = 1)
    or (kind = 'team' and max_members = 5)
  )
);

create unique index if not exists workspaces_one_personal_per_owner
  on public.workspaces (owner_user_id)
  where kind = 'personal';

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user_id
  on public.workspace_members (user_id);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token text not null unique,
  created_by_user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_invites_workspace_id
  on public.workspace_invites (workspace_id)
  where revoked_at is null;

-- Ledger columns (nullable during backfill)
alter table public.accounts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists created_by_user_id uuid references public.app_users(id) on delete set null;

alter table public.categories
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists created_by_user_id uuid references public.app_users(id) on delete set null;

alter table public.entries
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists created_by_user_id uuid references public.app_users(id) on delete set null;

alter table public.transfers
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists created_by_user_id uuid references public.app_users(id) on delete set null;

-- Personal workspace per existing user
insert into public.workspaces (kind, name, owner_user_id, max_members)
select 'personal', 'Личный', u.id, 1
from public.app_users u
where not exists (
  select 1
  from public.workspaces w
  where w.owner_user_id = u.id
    and w.kind = 'personal'
);

insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.owner_user_id, 'owner'
from public.workspaces w
where w.kind = 'personal'
  and not exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = w.id
      and m.user_id = w.owner_user_id
  );

-- Backfill ledger rows from personal workspace
update public.accounts a
set
  workspace_id = w.id,
  created_by_user_id = coalesce(a.created_by_user_id, a.user_id)
from public.workspaces w
where w.owner_user_id = a.user_id
  and w.kind = 'personal'
  and a.workspace_id is null;

update public.categories c
set
  workspace_id = w.id,
  created_by_user_id = coalesce(c.created_by_user_id, c.user_id)
from public.workspaces w
where w.owner_user_id = c.user_id
  and w.kind = 'personal'
  and c.workspace_id is null;

update public.entries e
set
  workspace_id = w.id,
  created_by_user_id = coalesce(e.created_by_user_id, e.user_id)
from public.workspaces w
where w.owner_user_id = e.user_id
  and w.kind = 'personal'
  and e.workspace_id is null;

update public.transfers t
set
  workspace_id = w.id,
  created_by_user_id = coalesce(t.created_by_user_id, t.user_id)
from public.workspaces w
where w.owner_user_id = t.user_id
  and w.kind = 'personal'
  and t.workspace_id is null;

alter table public.accounts
  alter column workspace_id set not null;

alter table public.categories
  alter column workspace_id set not null;

alter table public.entries
  alter column workspace_id set not null;

alter table public.transfers
  alter column workspace_id set not null;

-- Until API passes workspace_id explicitly (phase 2), fill from personal workspace via user_id.
create or replace function public.fill_ledger_workspace_from_user()
returns trigger
language plpgsql
as $$
declare
  personal_workspace_id uuid;
begin
  if new.workspace_id is not null then
    if new.created_by_user_id is null and new.user_id is not null then
      new.created_by_user_id := new.user_id;
    end if;
    return new;
  end if;

  if new.user_id is null then
    raise exception 'ledger row requires user_id or workspace_id';
  end if;

  select w.id
  into personal_workspace_id
  from public.workspaces w
  where w.owner_user_id = new.user_id
    and w.kind = 'personal'
  limit 1;

  if personal_workspace_id is null then
    raise exception 'personal workspace not found for user %', new.user_id;
  end if;

  new.workspace_id := personal_workspace_id;
  new.created_by_user_id := coalesce(new.created_by_user_id, new.user_id);
  return new;
end;
$$;

drop trigger if exists fill_accounts_workspace_from_user on public.accounts;
create trigger fill_accounts_workspace_from_user
before insert or update on public.accounts
for each row
execute function public.fill_ledger_workspace_from_user();

drop trigger if exists fill_categories_workspace_from_user on public.categories;
create trigger fill_categories_workspace_from_user
before insert or update on public.categories
for each row
execute function public.fill_ledger_workspace_from_user();

drop trigger if exists fill_entries_workspace_from_user on public.entries;
create trigger fill_entries_workspace_from_user
before insert or update on public.entries
for each row
execute function public.fill_ledger_workspace_from_user();

drop trigger if exists fill_transfers_workspace_from_user on public.transfers;
create trigger fill_transfers_workspace_from_user
before insert or update on public.transfers
for each row
execute function public.fill_ledger_workspace_from_user();

-- Categories: unique per workspace (was per user_id)
alter table public.categories
  drop constraint if exists categories_user_id_kind_name_key;

-- Keep user_id nullable for transition; existing services may still populate it until phase 2.
alter table public.categories
  alter column user_id drop not null;

alter table public.categories
  add constraint categories_workspace_kind_name_key unique (workspace_id, kind, name);

-- Workspace-scoped indexes
create index if not exists idx_accounts_workspace_id
  on public.accounts (workspace_id);

create index if not exists idx_categories_workspace_id_kind
  on public.categories (workspace_id, kind);

create index if not exists idx_categories_workspace_archived
  on public.categories (workspace_id, is_archived)
  where is_archived = false;

create index if not exists idx_entries_workspace_occurred_at
  on public.entries (workspace_id, occurred_at desc);

create index if not exists idx_entries_workspace_account_occurred_at
  on public.entries (workspace_id, account_id, occurred_at desc);

create index if not exists idx_entries_workspace_kind_occurred_at
  on public.entries (workspace_id, kind, occurred_at desc);

create index if not exists idx_transfers_workspace_occurred_at
  on public.transfers (workspace_id, occurred_at desc);

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();
