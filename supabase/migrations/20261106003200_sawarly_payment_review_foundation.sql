-- SAWARLY payment evidence and review foundation.
-- OCR data is advisory only: it never marks an order paid or grants PRO access.

alter table public.payment_orders
  add column if not exists plan text,
  add column if not exists review_window_started_at timestamptz,
  add column if not exists review_window_ends_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists review_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_orders_plan_check'
      and conrelid = 'public.payment_orders'::regclass
  ) then
    alter table public.payment_orders
      add constraint payment_orders_plan_check
      check (plan is null or plan in ('monthly', 'yearly'));
  end if;
end $$;

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 8388608),
  extracted_sender_phone text,
  extracted_recipient_phone text,
  extracted_recipient_name text,
  extracted_amount_piasters integer check (extracted_amount_piasters is null or extracted_amount_piasters > 0),
  extracted_transaction_id text,
  extracted_transfer_at timestamptz,
  ocr_result jsonb not null default '{}'::jsonb,
  matching_status text not null default 'pending'
    check (matching_status in ('pending', 'matched', 'mismatch', 'needs_review')),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'manual_review', 'verified', 'rejected')),
  review_window_started_at timestamptz not null default now(),
  review_window_ends_at timestamptz not null default (now() + interval '5 minutes'),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index if not exists payment_receipts_user_created_idx
  on public.payment_receipts(user_id, created_at desc);
create index if not exists payment_receipts_order_created_idx
  on public.payment_receipts(order_id, created_at desc);
create index if not exists payment_receipts_transaction_idx
  on public.payment_receipts(extracted_transaction_id)
  where extracted_transaction_id is not null;

create table if not exists public.payment_audit_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  receipt_id uuid references public.payment_receipts(id) on delete set null,
  actor_id uuid references auth.users(id),
  event_type text not null check (
    event_type in (
      'order_created',
      'receipt_uploaded',
      'ocr_completed',
      'match_completed',
      'review_started',
      'review_approved',
      'review_rejected',
      'order_expired'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_audit_events_order_created_idx
  on public.payment_audit_events(order_id, created_at desc);

alter table public.payment_receipts enable row level security;
alter table public.payment_audit_events enable row level security;

revoke all on public.payment_receipts from anon, authenticated;
revoke all on public.payment_audit_events from anon, authenticated;
grant select on public.payment_receipts to authenticated;
grant select on public.payment_audit_events to authenticated;

drop policy if exists payment_receipts_read_owner_or_payment_staff on public.payment_receipts;
create policy payment_receipts_read_owner_or_payment_staff
  on public.payment_receipts
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') in ('admin', 'payment_review')
  );

drop policy if exists payment_audit_events_read_payment_staff on public.payment_audit_events;
create policy payment_audit_events_read_payment_staff
  on public.payment_audit_events
  for select
  to authenticated
  using (
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') in ('admin', 'payment_review')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
