create index if not exists payment_orders_reviewed_by_idx
  on public.payment_orders(reviewed_by)
  where reviewed_by is not null;

create index if not exists payment_receipts_reviewed_by_idx
  on public.payment_receipts(reviewed_by)
  where reviewed_by is not null;

create index if not exists payment_audit_events_actor_id_idx
  on public.payment_audit_events(actor_id)
  where actor_id is not null;

create index if not exists payment_audit_events_receipt_id_idx
  on public.payment_audit_events(receipt_id)
  where receipt_id is not null;
