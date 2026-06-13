create extension if not exists "pgcrypto";

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  display_name text not null,
  role text not null default 'cashier' check (role in ('admin','cashier')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  barcode text not null,
  name text not null,
  category text not null default 'ทั่วไป',
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  stock numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 5,
  unit text not null default 'ชิ้น',
  image text,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(store_id, barcode)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  cashier_id uuid references auth.users(id),
  receipt_no text not null,
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  payment_method text not null,
  received numeric(12,2),
  change_amount numeric(12,2),
  created_at timestamptz not null default now(),
  unique(store_id, receipt_no)
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity numeric(12,3) not null,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(12,3) not null,
  movement_type text not null check (movement_type in ('sale','receive','adjust','return')),
  reference_id uuid,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;

create or replace function public.current_store_id() returns uuid language sql stable security definer set search_path = public as $$
  select store_id from public.profiles where id = auth.uid();
$$;

drop policy if exists "members read store" on public.stores;
create policy "members read store" on public.stores for select to authenticated using (id = public.current_store_id());
drop policy if exists "members read profiles" on public.profiles;
create policy "members read profiles" on public.profiles for select to authenticated using (store_id = public.current_store_id());
drop policy if exists "members manage products" on public.products;
create policy "members manage products" on public.products for all to authenticated using (store_id = public.current_store_id()) with check (store_id = public.current_store_id());
drop policy if exists "members manage sales" on public.sales;
create policy "members manage sales" on public.sales for all to authenticated using (store_id = public.current_store_id()) with check (store_id = public.current_store_id());
drop policy if exists "members manage sale items" on public.sale_items;
create policy "members manage sale items" on public.sale_items for all to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and s.store_id = public.current_store_id())) with check (exists (select 1 from public.sales s where s.id = sale_id and s.store_id = public.current_store_id()));
drop policy if exists "members manage stock movements" on public.stock_movements;
create policy "members manage stock movements" on public.stock_movements for all to authenticated using (store_id = public.current_store_id()) with check (store_id = public.current_store_id());
