-- ============================================================
-- KPI Tables — rodar no Supabase SQL Editor
-- ============================================================

-- Tabela de metas (uma linha por coluna/KPI)
CREATE TABLE IF NOT EXISTS metas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_coluna  text NOT NULL UNIQUE,          -- nome exato do cabeçalho na planilha
  label        text NOT NULL,                 -- nome exibido na interface
  valor_meta   numeric NOT NULL DEFAULT 0,    -- valor alvo principal (para barra de progresso)
  tipo         text NOT NULL DEFAULT 'maior_melhor'
               CHECK (tipo IN ('maior_melhor', 'menor_melhor')),
  amarelo_inicio numeric NOT NULL DEFAULT 0,  -- a partir daqui é amarelo
  verde_inicio   numeric NOT NULL DEFAULT 0,  -- a partir daqui é verde
  unidade      text NOT NULL DEFAULT '',      -- '%', 'seg', etc.
  basico       boolean NOT NULL DEFAULT false, -- exibir no KPI Básico (visão compacta)
  ordem        integer NOT NULL DEFAULT 0,    -- ordem de exibição no KPI Básico
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- RLS para metas
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler
CREATE POLICY "metas_select" ON metas
  FOR SELECT TO authenticated USING (true);

-- Apenas service_role pode escrever (usamos admin client nas actions)
CREATE POLICY "metas_insert" ON metas
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "metas_update" ON metas
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "metas_delete" ON metas
  FOR DELETE TO service_role USING (true);

-- ============================================================

-- Tabela de configuração geral (chave/valor)
CREATE TABLE IF NOT EXISTS config (
  chave      text PRIMARY KEY,
  valor      text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- RLS para config
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_select" ON config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "config_insert" ON config
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "config_update" ON config
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Linha inicial de aba ativa (em branco — gestor define no painel)
INSERT INTO config (chave, valor)
VALUES ('aba_ativa', '')
ON CONFLICT (chave) DO NOTHING;
