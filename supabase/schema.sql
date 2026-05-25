-- Industrial Cafe and Kebabs Supabase schema
-- Run this in the Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

create type public.staff_role as enum ('customer', 'staff', 'manager', 'admin');
create type public.fulfillment_type as enum ('pickup', 'delivery');
create type public.order_status as enum (
  'placed',
  'confirmed',
  'rejected',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'picked_up',
  'cancelled'
);
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.loyalty_transaction_type as enum ('earn', 'redeem', 'adjustment', 'expire');
create type public.reward_status as enum ('available', 'redeemed', 'expired');
create type public.pos_provider as enum ('mock', 'square', 'lightspeed');
create type public.pos_sync_status as enum ('pending', 'synced', 'failed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.staff_role not null default 'customer',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  birthday date,
  default_delivery_address text,
  delivery_notes text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  is_available boolean not null default true,
  is_in_stock boolean not null default true,
  tax_rate numeric(5, 4) not null default 0.1000,
  pos_provider public.pos_provider,
  pos_external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pos_provider, pos_external_id)
);

create table public.menu_item_options (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  option_group text,
  price_delta_cents integer not null default 0,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  pos_external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  selected_options jsonb not null default '[]'::jsonb,
  special_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  percent_off numeric(5, 2) check (percent_off >= 0 and percent_off <= 100),
  amount_off_cents integer check (amount_off_cents >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (percent_off is not null or amount_off_cents is not null)
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  postcode text,
  suburb text,
  polygon_geojson jsonb,
  minimum_order_cents integer not null default 0 check (minimum_order_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.users(id) on delete restrict,
  fulfillment_type public.fulfillment_type not null,
  status public.order_status not null default 'placed',
  payment_status public.payment_status not null default 'pending',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  discount_code_id uuid references public.discount_codes(id) on delete set null,
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  pickup_at timestamptz,
  delivery_address text,
  delivery_instructions text,
  pos_provider public.pos_provider default 'mock',
  pos_external_id text,
  pos_sync_status public.pos_sync_status not null default 'pending',
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (fulfillment_type = 'pickup' and delivery_address is null)
    or (fulfillment_type = 'delivery' and delivery_address is not null)
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  selected_options jsonb not null default '[]'::jsonb,
  special_instructions text,
  created_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  points_balance integer not null default 0 check (points_balance >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  lifetime_spend_cents integer not null default 0 check (lifetime_spend_cents >= 0),
  pos_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  transaction_type public.loyalty_transaction_type not null,
  points integer not null,
  description text,
  pos_provider public.pos_provider,
  pos_external_id text,
  created_at timestamptz not null default now()
);

create table public.coffee_rewards (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  reward_name text not null default 'Free coffee',
  stamps_required integer not null default 10 check (stamps_required > 0),
  stamps_earned integer not null default 0 check (stamps_earned >= 0),
  status public.reward_status not null default 'available',
  earned_at timestamptz,
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pos_sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider public.pos_provider not null,
  action text not null,
  status public.pos_sync_status not null default 'pending',
  order_id uuid references public.orders(id) on delete set null,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  external_reference text,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_users_role on public.users(role);
create index idx_menu_items_category_id on public.menu_items(category_id);
create index idx_menu_items_availability on public.menu_items(is_available, is_in_stock);
create index idx_cart_items_user_id on public.cart_items(user_id);
create index idx_orders_customer_id on public.orders(customer_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_fulfillment_created on public.orders(fulfillment_type, created_at desc);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_status_history_order_id on public.order_status_history(order_id, created_at desc);
create index idx_loyalty_accounts_user_id on public.loyalty_accounts(user_id);
create index idx_pos_sync_logs_provider_action on public.pos_sync_logs(provider, action, created_at desc);

create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_customer_profiles_updated_at before update on public.customer_profiles for each row execute function public.set_updated_at();
create trigger set_menu_categories_updated_at before update on public.menu_categories for each row execute function public.set_updated_at();
create trigger set_menu_items_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
create trigger set_menu_item_options_updated_at before update on public.menu_item_options for each row execute function public.set_updated_at();
create trigger set_cart_items_updated_at before update on public.cart_items for each row execute function public.set_updated_at();
create trigger set_discount_codes_updated_at before update on public.discount_codes for each row execute function public.set_updated_at();
create trigger set_delivery_zones_updated_at before update on public.delivery_zones for each row execute function public.set_updated_at();
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger set_loyalty_accounts_updated_at before update on public.loyalty_accounts for each row execute function public.set_updated_at();
create trigger set_coffee_rewards_updated_at before update on public.coffee_rewards for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('staff', 'manager', 'admin')
  );
$$;

alter table public.users enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_options enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.coffee_rewards enable row level security;
alter table public.discount_codes enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.pos_sync_logs enable row level security;

create policy "staff manage users" on public.users for all using (public.is_staff()) with check (public.is_staff());
create policy "users view own account" on public.users for select using (id = auth.uid());

create policy "staff manage customer profiles" on public.customer_profiles for all using (public.is_staff()) with check (public.is_staff());
create policy "customers view own profile" on public.customer_profiles for select using (user_id = auth.uid());
create policy "customers update own profile" on public.customer_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "public read active categories" on public.menu_categories for select using (is_active = true);
create policy "staff manage categories" on public.menu_categories for all using (public.is_staff()) with check (public.is_staff());

create policy "public read available menu items" on public.menu_items for select using (is_available = true and is_in_stock = true);
create policy "staff manage menu items" on public.menu_items for all using (public.is_staff()) with check (public.is_staff());

create policy "public read available item options" on public.menu_item_options
  for select using (
    is_available = true
    and exists (
      select 1 from public.menu_items
      where menu_items.id = menu_item_options.menu_item_id
        and menu_items.is_available = true
        and menu_items.is_in_stock = true
    )
  );
create policy "staff manage item options" on public.menu_item_options for all using (public.is_staff()) with check (public.is_staff());

create policy "customers manage own cart" on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff view carts" on public.cart_items for select using (public.is_staff());

create policy "customers create own orders" on public.orders for insert with check (customer_id = auth.uid());
create policy "customers view own orders" on public.orders for select using (customer_id = auth.uid());
create policy "staff manage orders" on public.orders for all using (public.is_staff()) with check (public.is_staff());

create policy "customers view own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.customer_id = auth.uid()
    )
  );
create policy "staff manage order items" on public.order_items for all using (public.is_staff()) with check (public.is_staff());

create policy "customers view own order status history" on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_status_history.order_id
        and orders.customer_id = auth.uid()
    )
  );
create policy "staff manage order status history" on public.order_status_history for all using (public.is_staff()) with check (public.is_staff());

create policy "customers view own loyalty account" on public.loyalty_accounts for select using (user_id = auth.uid());
create policy "staff manage loyalty accounts" on public.loyalty_accounts for all using (public.is_staff()) with check (public.is_staff());

create policy "customers view own loyalty transactions" on public.loyalty_transactions
  for select using (
    exists (
      select 1 from public.loyalty_accounts
      where loyalty_accounts.id = loyalty_transactions.loyalty_account_id
        and loyalty_accounts.user_id = auth.uid()
    )
  );
create policy "staff manage loyalty transactions" on public.loyalty_transactions for all using (public.is_staff()) with check (public.is_staff());

create policy "customers view own coffee rewards" on public.coffee_rewards
  for select using (
    exists (
      select 1 from public.loyalty_accounts
      where loyalty_accounts.id = coffee_rewards.loyalty_account_id
        and loyalty_accounts.user_id = auth.uid()
    )
  );
create policy "staff manage coffee rewards" on public.coffee_rewards for all using (public.is_staff()) with check (public.is_staff());

create policy "public read active discounts" on public.discount_codes for select using (is_active = true);
create policy "staff manage discount codes" on public.discount_codes for all using (public.is_staff()) with check (public.is_staff());

create policy "public read active delivery zones" on public.delivery_zones for select using (is_active = true);
create policy "staff manage delivery zones" on public.delivery_zones for all using (public.is_staff()) with check (public.is_staff());

create policy "staff manage pos sync logs" on public.pos_sync_logs for all using (public.is_staff()) with check (public.is_staff());
