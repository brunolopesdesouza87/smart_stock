-- SmartStock: Adiciona URL da imagem do produto
-- Executar no Supabase SQL Editor
-- Data: 2026
-- Descricao: Adiciona coluna image_url na tabela products

ALTER TABLE public.products
ADD COLUMN image_url TEXT;

COMMENT ON COLUMN public.products.image_url IS 'URL publica da imagem do produto armazenada no storage';
