-- SmartPDV: Sistema de Gerenciamento de Clientes
-- Execute no Supabase SQL Editor

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    fiado_limit NUMERIC(10, 2) DEFAULT 0,
    fiado_balance NUMERIC(10, 2) DEFAULT 0,
    saldo_em_haver NUMERIC(10, 2) DEFAULT 0,
    total_spent NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON public.customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Tabela de Histórico de Fiado (para rastreamento de débitos e acertos)
CREATE TABLE IF NOT EXISTS public.customer_fiado_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('debit', 'payment')),
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_customer_fiado_history_customer_id ON public.customer_fiado_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_fiado_history_sale_id ON public.customer_fiado_history(sale_id);
CREATE INDEX IF NOT EXISTS idx_customer_fiado_history_created_at ON public.customer_fiado_history(created_at DESC);

-- Adicionar coluna saldo_em_haver se não existir
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS saldo_em_haver NUMERIC(10, 2) DEFAULT 0;

-- Atualizar tabela de vendas para incluir customer_id (se não existir)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Índice para vendas por cliente
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);

-- RLS (Row Level Security) para Clientes
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clientes visíveis apenas pela organização" ON public.customers;
DROP POLICY IF EXISTS "Clientes podem ser inseridos apenas pela organização" ON public.customers;
DROP POLICY IF EXISTS "Clientes podem ser atualizados apenas pela organização" ON public.customers;
DROP POLICY IF EXISTS "Clientes podem ser deletados apenas pela organização" ON public.customers;

CREATE POLICY "Clientes visíveis apenas pela organização" ON public.customers
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Clientes podem ser inseridos apenas pela organização" ON public.customers
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Clientes podem ser atualizados apenas pela organização" ON public.customers
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Clientes podem ser deletados apenas pela organização" ON public.customers
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- RLS para Histórico de Fiado
ALTER TABLE public.customer_fiado_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Histórico de fiado visível apenas pela organização" ON public.customer_fiado_history;
DROP POLICY IF EXISTS "Histórico de fiado pode ser inserido" ON public.customer_fiado_history;

CREATE POLICY "Histórico de fiado visível apenas pela organização" ON public.customer_fiado_history
    FOR SELECT USING (customer_id IN (
        SELECT id FROM public.customers WHERE organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Histórico de fiado pode ser inserido" ON public.customer_fiado_history
    FOR INSERT WITH CHECK (customer_id IN (
        SELECT id FROM public.customers WHERE organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    ));

COMMENT ON TABLE public.customers IS 'Tabela de clientes registrados do PDV';
COMMENT ON TABLE public.customer_fiado_history IS 'Histórico de transações de fiado (débitos e acertos)';
COMMENT ON COLUMN public.customers.cpf IS 'CPF único do cliente';
COMMENT ON COLUMN public.customers.fiado_balance IS 'Saldo atual devedor em fiado (positivo = deve)';
COMMENT ON COLUMN public.customers.saldo_em_haver IS 'Saldo a receber do cliente ou crédito deixado conosco (positivo = cliente deve, negativo = temos crédito para ele)';
COMMENT ON COLUMN public.customers.fiado_limit IS 'Limite de crédito em fiado permitido';
