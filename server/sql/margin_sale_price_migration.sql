-- Migração: adicionar campos "margin" e "sale_price" na tabela products
-- margin: margem de lucro em percentual (ex: 30 = 30%)
-- sale_price: preço de venda calculado a partir do custo + margem
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS margin numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric(10,2) NOT NULL DEFAULT 0;

-- Comentários das colunas
COMMENT ON COLUMN public.products.margin IS 'Margem de lucro em percentual (ex: 30 = 30%). Calculada automaticamente a partir do custo e preço de venda.';
COMMENT ON COLUMN public.products.sale_price IS 'Preço de venda do produto. Calculado automaticamente a partir do preço de custo + margem.';
