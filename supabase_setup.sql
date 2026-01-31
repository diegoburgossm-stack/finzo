
-- Create tables for Finzo App
-- Run this in Supabase SQL Editor

-- Create Tarjetas table
create table public.tarjetas (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null, -- 'debit' | 'credit'
  initial_balance numeric not null default 0,
  color text,
  last4 text,
  payment_day integer,
  custom_monthly_bill_amount numeric,
  min_balance_threshold numeric,
  total_limit numeric,
  created_at timestamptz default now(),
  primary key (id)
);

-- Create Movimientos table
create table public.movimientos (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  description text not null,
  type text not null, -- 'income' | 'expense'
  card_id text references public.tarjetas(id) on delete set null,
  category text,
  date timestamptz default now(),
  is_monthly_payment boolean default false,
  installments_total integer,
  installments_current integer,
  created_at timestamptz default now(),
  primary key (id)
);

-- Create Suscripciones table
create table public.suscripciones (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null,
  card_id text references public.tarjetas(id) on delete set null,
  billing_day integer not null,
  billing_cycle text not null default 'monthly',
  category text default 'subscriptions',
  active boolean default true,
  color text,
  created_at timestamptz default now(),
  primary key (id)
);

-- Enable RLS
alter table public.tarjetas enable row level security;
alter table public.movimientos enable row level security;
alter table public.suscripciones enable row level security;

-- Create policies
create policy "Users can view their own cards" on public.tarjetas
  for select using (auth.uid() = user_id);

create policy "Users can insert their own cards" on public.tarjetas
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own cards" on public.tarjetas
  for update using (auth.uid() = user_id);

create policy "Users can delete their own cards" on public.tarjetas
  for delete using (auth.uid() = user_id);

create policy "Users can view their own transactions" on public.movimientos
  for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions" on public.movimientos
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions" on public.movimientos
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions" on public.movimientos
  for delete using (auth.uid() = user_id);

-- Subscriptions policies
create policy "Users can view their own subscriptions" on public.suscripciones
  for select using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions" on public.suscripciones
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions" on public.suscripciones
  for update using (auth.uid() = user_id);

create policy "Users can delete their own subscriptions" on public.suscripciones
  for delete using (auth.uid() = user_id);
