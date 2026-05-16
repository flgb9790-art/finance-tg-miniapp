-- Performance indexes for audit log and exchange-rate lookups.

create index if not exists idx_audit_events_workspace_created_at
  on public.audit_events (workspace_id, created_at desc);

create index if not exists idx_exchange_rates_updated_at
  on public.exchange_rates (updated_at desc);
