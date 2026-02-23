-- SmartStock - Setup da tabela de fornecedores (Supabase)
-- Execute este script no SQL Editor do Supabase

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  document text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_suppliers_org on public.suppliers (organization_id);
create index if not exists idx_suppliers_org_name on public.suppliers (organization_id, name);

alter table public.suppliers enable row level security;

-- Remover políticas antigas para evitar conflito
DROP POLICY IF EXISTS "suppliers_select_same_org" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_same_org" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_same_org" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_same_org" ON public.suppliers;

-- SELECT: usuários da mesma organização podem listar
create policy "suppliers_select_same_org"
on public.suppliers
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = suppliers.organization_id
  )
);

-- INSERT: admin da mesma organização pode criar
create policy "suppliers_insert_same_org"
on public.suppliers
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = suppliers.organization_id
      and p.role = 'admin'
  )
);

-- UPDATE: admin da mesma organização pode editar
create policy "suppliers_update_same_org"
on public.suppliers
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = suppliers.organization_id
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = suppliers.organization_id
      and p.role = 'admin'
  )
);

-- DELETE: admin da mesma organização pode excluir
create policy "suppliers_delete_same_org"
on public.suppliers
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = suppliers.organization_id
      and p.role = 'admin'
  )
);
