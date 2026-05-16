-- Paginated operations timeline (entries + transfers) for history tab.

create or replace function public.fetch_operations_timeline_page(
  p_workspace_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_kind text,
  p_account_id uuid,
  p_category_id uuid,
  p_limit integer,
  p_offset integer
)
returns table (
  row_kind text,
  row_id uuid,
  occurred_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with entry_rows as (
    select
      'entry'::text as row_kind,
      e.id as row_id,
      e.occurred_at
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
  ),
  transfer_rows as (
    select
      'transfer'::text as row_kind,
      t.id as row_id,
      t.occurred_at
    from public.transfers t
    where t.workspace_id = p_workspace_id
      and t.occurred_at >= p_from
      and t.occurred_at <= p_to
      and p_category_id is null
      and coalesce(p_kind, 'all') in ('all', 'transfer')
      and (
        p_account_id is null
        or t.from_account_id = p_account_id
        or t.to_account_id = p_account_id
      )
  ),
  timeline as (
    select * from entry_rows
    union all
    select * from transfer_rows
  ),
  ranked as (
    select
      row_kind,
      row_id,
      occurred_at,
      count(*) over () as total_count
    from timeline
    order by occurred_at desc
  )
  select row_kind, row_id, occurred_at, total_count
  from ranked
  limit greatest(coalesce(p_limit, 25), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.fetch_operations_timeline_page(
  uuid, timestamptz, timestamptz, text, uuid, uuid, integer, integer
) from public;

grant execute on function public.fetch_operations_timeline_page(
  uuid, timestamptz, timestamptz, text, uuid, uuid, integer, integer
) to service_role;
