-- Report period aggregates (FX conversion on API). Replaces full entry scans for light/full report core.

create or replace function public.fetch_report_period_aggregates(
  p_workspace_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_account_id uuid,
  p_category_id uuid,
  p_kind text
)
returns table (
  agg_section text,
  category_name text,
  currency_code text,
  kind text,
  day_utc date,
  spark_slot smallint,
  total_amount numeric,
  entry_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered_entries as (
    select
      e.amount::numeric as amount,
      e.currency_code,
      e.kind,
      e.occurred_at,
      coalesce(c.name, 'Без категории') as category_name
    from public.entries e
    left join public.categories c on c.id = e.category_id
    where e.workspace_id = p_workspace_id
      and e.occurred_at >= p_from
      and e.occurred_at <= p_to
      and (p_account_id is null or e.account_id = p_account_id)
      and (p_category_id is null or e.category_id = p_category_id)
      and (
        coalesce(p_kind, '') = ''
        or e.kind = p_kind
      )
  ),
  currency_kind as (
    select
      'currency_kind'::text as agg_section,
      null::text as category_name,
      fe.currency_code,
      fe.kind,
      null::date as day_utc,
      null::smallint as spark_slot,
      sum(fe.amount) as total_amount,
      count(*)::bigint as entry_count
    from filtered_entries fe
    group by fe.currency_code, fe.kind
  ),
  by_category as (
    select
      'category'::text as agg_section,
      fe.category_name,
      fe.currency_code,
      fe.kind,
      null::date as day_utc,
      null::smallint as spark_slot,
      sum(fe.amount) as total_amount,
      count(*)::bigint as entry_count
    from filtered_entries fe
    group by fe.category_name, fe.currency_code, fe.kind
  ),
  by_day as (
    select
      'utc_day'::text as agg_section,
      null::text as category_name,
      fe.currency_code,
      fe.kind,
      (fe.occurred_at at time zone 'UTC')::date as day_utc,
      null::smallint as spark_slot,
      sum(fe.amount) as total_amount,
      count(*)::bigint as entry_count
    from filtered_entries fe
    group by (fe.occurred_at at time zone 'UTC')::date, fe.currency_code, fe.kind
  ),
  by_day_slot as (
    select
      'utc_day_slot'::text as agg_section,
      null::text as category_name,
      fe.currency_code,
      fe.kind,
      (fe.occurred_at at time zone 'UTC')::date as day_utc,
      least(
        5::smallint,
        floor(extract(hour from fe.occurred_at at time zone 'UTC') / 4)::smallint
      ) as spark_slot,
      sum(fe.amount) as total_amount,
      count(*)::bigint as entry_count
    from filtered_entries fe
    group by
      (fe.occurred_at at time zone 'UTC')::date,
      least(
        5::smallint,
        floor(extract(hour from fe.occurred_at at time zone 'UTC') / 4)::smallint
      ),
      fe.currency_code,
      fe.kind
  )
  select * from currency_kind
  union all
  select * from by_category
  union all
  select * from by_day
  union all
  select * from by_day_slot;
$$;

revoke all on function public.fetch_report_period_aggregates(
  uuid, timestamptz, timestamptz, uuid, uuid, text
) from public;

grant execute on function public.fetch_report_period_aggregates(
  uuid, timestamptz, timestamptz, uuid, uuid, text
) to service_role;

-- Net entries strictly after period end (balance at period end).
create or replace function public.fetch_report_entries_net_after(
  p_workspace_id uuid,
  p_after timestamptz
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
    and e.occurred_at > p_after
  group by e.currency_code, e.kind;
$$;

revoke all on function public.fetch_report_entries_net_after(uuid, timestamptz) from public;

grant execute on function public.fetch_report_entries_net_after(uuid, timestamptz) to service_role;
