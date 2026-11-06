alter table public.payment_orders
  add column if not exists expires_at timestamptz;

create index if not exists payment_orders_pending_expiry_idx
  on public.payment_orders(expires_at)
  where status = 'pending' and review_window_started_at is null;
