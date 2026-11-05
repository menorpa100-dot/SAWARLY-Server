-- Performance follow-up for the support inbox and existing subscription tables.
create index if not exists payment_orders_user_id_idx
  on public.payment_orders (user_id);
create index if not exists pro_subscriptions_user_id_idx
  on public.pro_subscriptions (user_id);
create index if not exists support_messages_sender_id_idx
  on public.support_messages (sender_id);

drop policy if exists "support_tickets_select_own_or_staff" on public.support_tickets;
create policy "support_tickets_select_own_or_staff"
on public.support_tickets for select to authenticated
using (
  user_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin', 'support')
);

drop policy if exists "support_tickets_update_staff" on public.support_tickets;
create policy "support_tickets_update_staff"
on public.support_tickets for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin', 'support'))
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin', 'support'));

drop policy if exists "support_messages_select_ticket_owner_or_staff" on public.support_messages;
create policy "support_messages_select_ticket_owner_or_staff"
on public.support_messages for select to authenticated
using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        t.user_id = (select auth.uid())
        or ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin', 'support')
      )
  )
);

drop policy if exists "support_messages_insert_user_or_staff" on public.support_messages;
create policy "support_messages_insert_user_or_staff"
on public.support_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    (
      sender_role = 'user'
      and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id
          and t.user_id = (select auth.uid())
          and t.status = 'open'
      )
    )
    or (
      sender_role = 'staff'
      and ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin', 'support')
      and exists (select 1 from public.support_tickets t where t.id = ticket_id)
    )
  )
);
