-- Adiciona colunas à tabela metas (seguro para rodar mais de uma vez)
ALTER TABLE metas ADD COLUMN IF NOT EXISTS ordem    integer NOT NULL DEFAULT 0;
ALTER TABLE metas ADD COLUMN IF NOT EXISTS icone    text    NOT NULL DEFAULT 'BarChart2';
ALTER TABLE metas ADD COLUMN IF NOT EXISTS descricao text   NOT NULL DEFAULT '';
