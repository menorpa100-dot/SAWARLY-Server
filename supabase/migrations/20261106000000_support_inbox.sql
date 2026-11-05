-- SAWARLY authenticated support inbox
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 120),
  category text not null default 'other'
    check (category in ('technical', 'account', 'subscription', 'other')),
  status text not null default 'open'
    check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_updated_idx
  on public.support_tickets (user_id, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'staff')),
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_ticket_created_idx
  on public.support_messages (ticket_id, created_at asc);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "support_tickets_select_own_or_staff" on public.support_tickets;
create policy "support_tickets_select_own_or_staff"
on public.support_tickets for select to authenticated
using (
  user_id = (select auth.uid())
  or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support')
);

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
on public.support_tickets for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "support_tickets_update_staff" on public.support_tickets;
create policy "support_tickets_update_staff"
on public.support_tickets for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support'))
with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support'));

drop policy if exists "support_messages_select_ticket_owner_or_staff" on public.support_messages;
create policy "support_messages_select_ticket_owner_or_staff"
on public.support_messages for select to authenticated
using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        t.user_id = (select auth.uid())
        or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support')
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
      and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'support')
      and exists (select 1 from public.support_tickets t where t.id = ticket_id)
    )
  )
);

revoke all on public.support_tickets, public.support_messages from anon;
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;
