-- Legacy crypto accounts were saved as USD when the currency select was disabled in the form.
update public.accounts
set currency_code = 'USDT'
where type = 'crypto'
  and currency_code = 'USD';

update public.entries e
set currency_code = 'USDT'
from public.accounts a
where e.account_id = a.id
  and a.type = 'crypto'
  and e.currency_code = 'USD';

update public.transfers t
set
  from_currency_code = 'USDT'
where exists (
  select 1
  from public.accounts a
  where a.id = t.from_account_id
    and a.type = 'crypto'
    and t.from_currency_code = 'USD'
);

update public.transfers t
set
  to_currency_code = 'USDT'
where exists (
  select 1
  from public.accounts a
  where a.id = t.to_account_id
    and a.type = 'crypto'
    and t.to_currency_code = 'USD'
);
