-- Ускорение отчётов и истории с фильтрами по счёту / типу операции.
-- Базовые idx_entries_user_id_occurred_at и idx_transfers_user_id_occurred_at — в 001_init_mvp.sql.

create index if not exists idx_entries_user_account_occurred_at
  on public.entries (user_id, account_id, occurred_at desc);

create index if not exists idx_entries_user_kind_occurred_at
  on public.entries (user_id, kind, occurred_at desc);

create index if not exists idx_categories_user_archived
  on public.categories (user_id, is_archived)
  where is_archived = false;
