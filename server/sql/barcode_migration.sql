-- SmartStock: Migration para adicionar campo de código de barras aos produtos
-- Executar no Supabase SQL Editor
-- Data: 2025
-- Descrição: Adiciona coluna barcode à tabela products para suportar leitura de códigos de barras

-- 1. Adicionar nova coluna barcode à tabela products
ALTER TABLE public.products
ADD COLUMN barcode VARCHAR(255) UNIQUE;

-- Criar índice para busca rápida por barcode (importante para performance em leitoras)
CREATE INDEX idx_products_barcode ON public.products(barcode);

-- 2. Atualizar RLS policy - SELECT (já permite barcode automaticamente)
-- A coluna UNIQUE permite evitar duplicatas de código de barras no mesmo fornecedor

-- 3. Criar função auxiliar para buscar produto por barcode
CREATE OR REPLACE FUNCTION public.get_product_by_barcode(
  p_organization_id UUID,
  p_barcode VARCHAR(255)
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  category_id UUID,
  name VARCHAR,
  barcode VARCHAR,
  unit VARCHAR,
  min_stock INTEGER,
  quantity INTEGER,
  price NUMERIC,
  last_count_date TIMESTAMP,
  expiry_date DATE,
  last_responsible VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    products.id,
    products.organization_id,
    products.category_id,
    products.name,
    products.barcode,
    products.unit,
    products.min_stock,
    products.quantity,
    products.price,
    products.last_count_date,
    products.expiry_date,
    products.last_responsible
  FROM products
  WHERE 
    products.organization_id = p_organization_id
    AND products.barcode = p_barcode
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Comentários de documentação
COMMENT ON COLUMN public.products.barcode IS 'Código de barras do produto para integração com leitora. Deve ser único por organização.';
COMMENT ON INDEX public.idx_products_barcode IS 'Índice para busca rápida de produtos por código de barras';
COMMENT ON FUNCTION public.get_product_by_barcode IS 'Função para buscar produto por código de barras em uma organização específica';

-- 5. Verificação: Listar todos os produtos e suas barcodes
-- Descomente a linha abaixo para validar após executar a migração:
-- SELECT id, name, barcode FROM public.products ORDER BY name;
