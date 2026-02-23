-- SmartStock: Migration para expandir campos de informações da empresa
-- Executar no Supabase SQL Editor
-- Data: 2025
-- Descrição: Adiciona campos de CNPJ, endereço, telefone, responsável e website à tabela organizations

-- 1. Adicionar novos campos à tabela organizations
ALTER TABLE public.organizations
ADD COLUMN cnpj VARCHAR(18),
ADD COLUMN address TEXT,
ADD COLUMN city VARCHAR(100),
ADD COLUMN state VARCHAR(2),
ADD COLUMN zip_code VARCHAR(10),
ADD COLUMN phone VARCHAR(20),
ADD COLUMN contact_person VARCHAR(150),
ADD COLUMN email VARCHAR(150),
ADD COLUMN website VARCHAR(255),
ADD COLUMN logo_url TEXT,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Criar índice para busca por CNPJ (se necessário)
CREATE INDEX idx_organizations_cnpj ON public.organizations(cnpj);

-- 3. Criar função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION public.update_organizations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para atualizar timestamp
DROP TRIGGER IF EXISTS trigger_update_organizations_timestamp ON public.organizations;
CREATE TRIGGER trigger_update_organizations_timestamp
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_organizations_timestamp();

-- 5. Comentários de documentação
COMMENT ON COLUMN public.organizations.cnpj IS 'CNPJ da empresa (formato: XX.XXX.XXX/XXXX-XX)';
COMMENT ON COLUMN public.organizations.address IS 'Endereço completo da empresa (rua, número)';
COMMENT ON COLUMN public.organizations.city IS 'Cidade sede da empresa';
COMMENT ON COLUMN public.organizations.state IS 'Estado/UF da empresa (2 dígitos)';
COMMENT ON COLUMN public.organizations.zip_code IS 'CEP da empresa (formato: XXXXX-XXX)';
COMMENT ON COLUMN public.organizations.phone IS 'Telefone de contato principal (formato: +55 11 98765-4321)';
COMMENT ON COLUMN public.organizations.contact_person IS 'Nome do responsável/proprietário da empresa';
COMMENT ON COLUMN public.organizations.email IS 'Email principal da empresa';
COMMENT ON COLUMN public.organizations.website IS 'Website/URL da empresa';
COMMENT ON COLUMN public.organizations.logo_url IS 'URL da logo da empresa para uso em documentos PDF';
COMMENT ON COLUMN public.organizations.updated_at IS 'Data e hora da última atualização das informações';

-- 6. Atualizar RLS policies para manter segurança multi-tenant
-- A segurança já é mantida através das policies existentes na tabela organizations

-- 7. Verificação: Listar estrutura da tabela atualizada
-- Descomente para ver os novos campos:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'organizations' ORDER BY ordinal_position;
