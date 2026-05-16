-- Team workspace audit log: create / update / delete entries & transfers (+ photos).

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references public.app_users(id) on delete cascade,
  action text not null check (
    action in ('created', 'updated', 'deleted', 'photo_added', 'photo_removed')
  ),
  entity_type text not null check (entity_type in ('entry', 'transfer')),
  entity_id uuid not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_workspace_created_at
  on public.audit_events (workspace_id, created_at desc);

create index if not exists idx_audit_events_workspace_entity
  on public.audit_events (workspace_id, entity_type, entity_id);
