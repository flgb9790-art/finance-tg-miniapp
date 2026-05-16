-- Aggregated entry totals for history summary (FX conversion still on API).

create or replace function public.fetch_operations_history_summary(
  p_workspace_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_kind text,
  p_account_id uuid,
  p_category_id uuid
)
returns table (
  currency_code text,
  kind text,
  total_amount numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.currency_code,
    e.kind,
    sum(e.amount::numeric) as total_amount
  from public.entries e
  where e.workspace_id = p_workspace_id
    and e.occurred_at >= p_from
    and e.occurred_at <= p_to
    and (p_category_id is null or e.category_id = p_category_id)
    and (p_account_id is null or e.account_id = p_account_id)
    and (
      coalesce(p_kind, 'all') = 'all'
      or (
        coalesce(p_kind, 'all') in ('income', 'expense')
        and e.kind = p_kind
      )
    )
    and coalesce(p_kind, 'all') <> 'transfer'
  group by e.currency_code, e.kind;
$$;

revoke all on function public.fetch_operations_history_summary(
  uuid, timestamptz, timestamptz, text, uuid, uuid
) from public;

grant execute on function public.fetch_operations_history_summary(
  uuid, timestamptz, timestamptz, text, uuid, uuid
) to service_role;
