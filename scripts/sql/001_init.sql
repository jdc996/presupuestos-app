-- Tablas para presupuestos (Supabase / Postgres)
-- Ejecuta este script en tu base de datos.
-- Reemplaza "auth.users" referencias según tu proveedor si no usas Supabase.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  color text not null,
  emoji text not null,
  budget numeric,
  created_at timestamptz not null default now(),
  constraint fk_categories_user foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists idx_categories_user on public.categories(user_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  note text,
  date timestamptz not null,
  created_at timestamptz not null default now(),
  constraint fk_tx_user foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_category on public.transactions(category_id);
create index if not exists idx_transactions_date on public.transactions(date);

-- Políticas de RLS (Supabase)
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'categories' and policyname = 'Categories are viewable by owner') then
    create policy "Categories are viewable by owner"
      on public.categories for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'categories' and policyname = 'Categories are insertable by owner') then
    create policy "Categories are insertable by owner"
      on public.categories for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'categories' and policyname = 'Categories are updatable by owner') then
    create policy "Categories are updatable by owner"
      on public.categories for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'categories' and policyname = 'Categories are deletable by owner') then
    create policy "Categories are deletable by owner"
      on public.categories for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'Transactions are viewable by owner') then
    create policy "Transactions are viewable by owner"
      on public.transactions for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'Transactions are insertable by owner') then
    create policy "Transactions are insertable by owner"
      on public.transactions for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'Transactions are updatable by owner') then
    create policy "Transactions are updatable by owner"
      on public.transactions for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'Transactions are deletable by owner') then
    create policy "Transactions are deletable by owner"
      on public.transactions for delete using (auth.uid() = user_id);
  end if;
end $$;
