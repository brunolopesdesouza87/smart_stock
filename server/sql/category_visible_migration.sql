-- Migração: adicionar campo "visible" na tabela categories
-- Este campo controla se a categoria (e seus produtos) aparece no PDV
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

-- Atualizar registros existentes para garantir que todos estejam visíveis por padrão
UPDATE public.categories SET visible = true WHERE visible IS NULL;

-- Comentário da coluna
COMMENT ON COLUMN public.categories.visible IS 'Controla visibilidade da categoria e seus produtos no PDV. false = oculto no PDV.';
