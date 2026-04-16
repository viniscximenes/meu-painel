-- ─────────────────────────────────────────────────────────────────────────────
-- rv_config: configurações do sistema de RV (chave/valor JSON)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rv_config (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  chave      text        UNIQUE NOT NULL,
  valor      text        NOT NULL DEFAULT '',
  descricao  text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.rv_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rv_config_leitura"
  ON public.rv_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "rv_config_escrita"
  ON public.rv_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- rv_resultados: resultados calculados por operador/mês (histórico)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rv_resultados (
  id                    uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  username              text          NOT NULL,
  mes                   int           NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano                   int           NOT NULL,
  elegivel              boolean       NOT NULL DEFAULT false,
  motivos_inelegivel    text[]        NOT NULL DEFAULT '{}',
  valor_retracao        numeric(10,2) NOT NULL DEFAULT 0,
  valor_indisp          numeric(10,2) NOT NULL DEFAULT 0,
  valor_tma             numeric(10,2) NOT NULL DEFAULT 0,
  valor_ticket          numeric(10,2) NOT NULL DEFAULT 0,
  rv_base               numeric(10,2) NOT NULL DEFAULT 0,
  multiplicador_pedidos numeric(6,4)  NOT NULL DEFAULT 1,
  rv_apos_pedidos       numeric(10,2) NOT NULL DEFAULT 0,
  bonus                 numeric(10,2) NOT NULL DEFAULT 0,
  rv_total              numeric(10,2) NOT NULL DEFAULT 0,
  calculado_em          timestamptz   DEFAULT now(),
  UNIQUE (username, mes, ano)
);

ALTER TABLE public.rv_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rv_resultados_leitura"
  ON public.rv_resultados FOR SELECT TO authenticated USING (true);

CREATE POLICY "rv_resultados_escrita"
  ON public.rv_resultados FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Configurações padrão (inserir apenas se ainda não existirem)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.rv_config (chave, valor, descricao) VALUES
  ('abs_maximo',            '5',
   'ABS máximo (%) para elegibilidade'),
  ('bonus_valor',           '300',
   'Valor do bônus em R$'),
  ('retracao_faixas',
   '[{"min":66,"valor":700},{"min":63,"valor":400},{"min":60,"valor":300},{"min":57,"valor":200}]',
   'Faixas de TX de Retenção (limiar % e prêmio R$)'),
  ('indisp_limite',         '14.5',
   'Limite máximo de Indisponibilidade (%)'),
  ('indisp_valor',          '150',
   'Prêmio por Indisponibilidade dentro do limite (R$)'),
  ('tma_limite_seg',        '731',
   'Limite máximo de TMA em segundos (731 = 12:11)'),
  ('tma_valor',             '150',
   'Prêmio por TMA dentro do limite (R$)'),
  ('ticket_faixas',
   '[{"min":-6,"valor":200},{"min":-9,"valor":150},{"min":-15,"valor":100},{"min":-18,"valor":50}]',
   'Faixas de Variação de Ticket (limiar % e prêmio R$)'),
  ('ticket_min_retracao',   '60',
   'TX Retenção mínima (%) para qualificar bônus de Ticket'),
  ('pedidos_meta',          '260',
   'Meta absoluta de pedidos do mês'),
  ('churn_meta',            '0',
   'Meta absoluta de churn do mês (0 = critério desabilitado)'),
  ('bonus_retracao_minima', '66',
   'TX Retenção mínima (%) para receber o bônus'),
  ('bonus_indisp_maxima',   '14.5',
   'Indisponibilidade máxima (%) para receber o bônus'),
  ('coluna_retracao',       'TX de Retenção',
   'Nome da coluna de TX Retenção na planilha'),
  ('coluna_indisp',         'Indisponibilidade',
   'Nome da coluna de Indisponibilidade na planilha'),
  ('coluna_tma',            'TMA',
   'Nome da coluna de TMA na planilha'),
  ('coluna_ticket',         'Variação de Ticket',
   'Nome da coluna de Variação de Ticket na planilha'),
  ('coluna_pedidos',        'Pedidos Realizados',
   'Nome da coluna de Pedidos Realizados na planilha'),
  ('coluna_churn',          'Churn',
   'Nome da coluna de Churn na planilha'),
  ('coluna_abs',            'ABS',
   'Nome da coluna de ABS na planilha')
ON CONFLICT (chave) DO NOTHING;
