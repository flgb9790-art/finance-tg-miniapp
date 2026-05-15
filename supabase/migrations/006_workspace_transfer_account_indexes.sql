-- Доп. индексы для фильтра истории/отчётов по счёту в transfers (workspace-scoped).
-- Базовые idx_entries_* / idx_transfers_workspace_occurred_at — в 005_workspaces_mvp.sql.
-- Старые idx_*_user_* из 001/004 остаются для совместимости; новые запросы идут по workspace_id.

create index if not exists idx_transfers_workspace_from_account_occurred_at
  on public.transfers (workspace_id, from_account_id, occurred_at desc);

create index if not exists idx_transfers_workspace_to_account_occurred_at
  on public.transfers (workspace_id, to_account_id, occurred_at desc);
