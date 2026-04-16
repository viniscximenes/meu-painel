-- ============================================================
-- Tabela de planilhas ativas — rodar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS planilhas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,           -- ex: "ABRIL.2026"
  spreadsheet_id text NOT NULL,           -- ID do Google Sheets
  aba            text NOT NULL DEFAULT '', -- aba/tab dentro da planilha (vazio = primeira)
  ativa          boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE planilhas ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado lê
CREATE POLICY "planilhas_select" ON planilhas
  FOR SELECT TO authenticated USING (true);

-- Apenas service_role escreve
CREATE POLICY "planilhas_write" ON planilhas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
