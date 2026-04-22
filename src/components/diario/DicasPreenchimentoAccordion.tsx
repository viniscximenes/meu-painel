'use client'

import { useState } from 'react'
import { HelpCircle, ChevronDown, Lightbulb } from 'lucide-react'

interface DicaTipo {
  titulo: string
  badgeBg: string
  badgeColor: string
  quandoUsar: string
  tempo: string
  exemplo: string
}

const DICAS: DicaTipo[] = [
  {
    titulo: 'PAUSA JUSTIFICADA',
    badgeBg: 'rgba(245,158,11,0.10)',
    badgeColor: '#f59e0b',
    quandoUsar: 'Quando a gestão autoriza o operador a ficar sem atender por motivo legítimo: feedback, treinamento, monitoramento, reunião ou tarefa administrativa.',
    tempo: 'Informe a duração real da pausa (ex: 0:18).',
    exemplo: 'Operadora foi autorizada pela gestão a colocar Pausa Feedback. Ficando um total de 00:18:36.',
  },
  {
    titulo: 'FORA DA JORNADA',
    badgeBg: 'rgba(96,165,250,0.10)',
    badgeColor: '#60a5fa',
    quandoUsar: 'Quando o operador teve um problema e não cumpriu a jornada de 06:20:00. Ex: problema de acesso, sistema fora do ar, indisponibilidade técnica.',
    tempo: 'Informe o tempo que o operador trabalhou (ex: 06:13:43). O sistema calcula automaticamente o déficit e salva.',
    exemplo: 'Operadora teve um problema com seu acesso por volta das 19:08 e conseguiu login apenas por volta das 20:00. Devido a isso, foi feito apenas 6:13:43 do tempo logado.',
  },
  {
    titulo: 'OUTROS',
    badgeBg: 'rgba(148,163,184,0.10)',
    badgeColor: '#94a3b8',
    quandoUsar: 'Quando uma situação ocorreu, mas o operador cumpriu a jornada mesmo assim. Registro documental, sem impacto nas métricas.',
    tempo: 'Opcional. Pode deixar em branco.',
    exemplo: 'Operador teve problema com seu acesso ao sistema por volta das 17:00 às 17:20. Porém cumpriu suas 06:20:00, sendo assim, não necessário inclusão direta.',
  },
  {
    titulo: 'GERAL — SETOR INTEIRO',
    badgeBg: 'rgba(167,139,250,0.10)',
    badgeColor: '#a78bfa',
    quandoUsar: 'Quando o sistema inteiro caiu e afetou toda a equipe ao mesmo tempo. Registro único, não precisa fazer um por operador.',
    tempo: 'Opcional. Pode deixar em branco.',
    exemplo: 'Sistema geral ficou fora do ar entre 14:30 e 15:00. Toda a equipe foi afetada.',
  },
]

export function DicasPreenchimentoAccordion() {
  const [expandido, setExpandido] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      {/* Header do accordion */}
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ cursor: 'pointer', background: 'none' }}
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
            Dicas de preenchimento
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Conteúdo colapsável */}
      <div
        style={{
          maxHeight: expandido ? '1000px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div
          className="px-4 pb-4 space-y-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="pt-4 space-y-4">
            {DICAS.map((dica) => (
              <div key={dica.titulo}>
                {/* Badge do tipo */}
                <span
                  className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{
                    background: dica.badgeBg,
                    color: dica.badgeColor,
                    border: `1px solid ${dica.badgeColor}30`,
                    letterSpacing: '0.07em',
                  }}
                >
                  {dica.titulo}
                </span>

                <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Quando usar: </span>
                    {dica.quandoUsar}
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Tempo: </span>
                    {dica.tempo}
                  </div>
                  <div
                    className="rounded-lg px-3 py-2 italic"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {dica.exemplo}
                  </div>
                </div>
              </div>
            ))}

            {/* Dica geral */}
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{
                background: 'rgba(201,168,76,0.05)',
                border: '1px solid rgba(201,168,76,0.15)',
              }}
            >
              <Lightbulb size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
              <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  <strong style={{ color: 'var(--gold-light)' }}>Sempre mencione os horários ou duração</strong> da ocorrência nas observações. Isso facilita auditoria posterior.
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Campo GLPI:</strong> preencha apenas quando houver chamado técnico envolvido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
