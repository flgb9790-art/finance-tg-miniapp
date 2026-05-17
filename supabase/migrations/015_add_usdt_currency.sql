insert into public.currencies (code, name, symbol)
values ('USDT', 'Tether USDT', 'USDT')
on conflict (code) do update
set
  name = excluded.name,
  symbol = excluded.symbol,
  is_active = true;
