-- Structured payload for audit log UI (amount, currency, operation label).

alter table public.audit_events
  add column if not exists details jsonb not null default '{}'::jsonb;
