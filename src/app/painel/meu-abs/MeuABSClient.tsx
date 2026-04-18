'use client'

import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'

export interface DiaCalendario {
  dia: number
  diaSemana: string
  status: string | null
  isDomingo: boolean
  isFuturo: boolean
  isHoje: boolean
}

export interface MeuABSProps {
  nomeOperador:    string
  mesLabel:        string
  absPercent:      number
  faltasNoMes:     number
  presencasCount:  number
  dias:            DiaCalendario[]
  primeiroDow:     number
  mesAtual:        number
  anoAtual:        number
}

// ── Cores por status ──────────────────────────────────────────────────────────

const STATUS_BG: Record<string, string> = {
  P:  'rgba(34,197,94,0.15)',
  F:  'rgba(239,68,68,0.22)',
  FO: 'rgba(59,130,246,0.15)',
  SC: 'rgba(245,158,11,0.15)',
  CT: 'rgba(245,158,11,0.15)',
  FE: 'rgba(168,85,247,0.15)',
  LI: 'rgba(249,115,22,0.15)',
  DS: 'rgba(107,114,128,0.15)',
  AT: 'rgba(56,189,248,0.15)',
  '-': 'rgba(255,255,255,0.02)',
}

const STATUS_COLOR: Record<string, string> = {
  P:  '#4ade80',
  F:  '#f87171',
  FO: '#60a5fa',
  SC: '#fbbf24',
  CT: '#fbbf24',
  FE: '#c084fc',
  LI: '#fb923c',
  DS: '#9ca3af',
  AT: '#7dd3fc',
  '-': 'var(--text-muted)',
}

const STATUS_LABEL: Record<string, string> = {
  P: 'Presente', F: 'Falta', FO: 'Folga', SC: 'Saiu Cedo',
  CT: 'Chegou Tarde', FE: 'Férias', LI: 'Licença', DS: 'Desligado',
  AT: 'Atestado', '-': 'Não registrado',
}

const LEGENDA_ITEMS = [
  { sigla: 'P',  label: 'Presente',      cor: '#4ade80' },
  { sigla: 'F',  label: 'Falta',         cor: '#f87171' },
  { sigla: 'FO', label: 'Folga',         cor: '#60a5fa' },
  { sigla: 'SC', label: 'Saiu Cedo',     cor: '#fbbf24' },
  { sigla: 'CT', label: 'Chegou Tarde',  cor: '#fbbf24' },
  { sigla: 'FE', label: 'Férias',        cor: '#c084fc' },
  { sigla: 'LI', label: 'Licença',       cor: '#fb923c' },
  { sigla: 'AT', label: 'Atestado',      cor: '#7dd3fc' },
  { sigla: 'DS', label: 'Desligado',     cor: '#9ca3af' },
]

// ── Componente Principal ──────────────────────────────────────────────────────

export default function MeuABSClient({
  absPercent, faltasNoMes, presencasCount,
  dias, primeiroDow,
}: MeuABSProps) {

  const absStatus = absPercent > 8 ? 'vermelho' : absPercent > 5 ? 'amarelo' : 'verde'
  const faltasStatus = faltasNoMes >= 2 ? 'vermelho' : faltasNoMes === 1 ? 'amarelo' : 'verde'
  const rvElegivel = faltasNoMes < 2

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes absIn {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Seção 1: Cards de Resumo */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px',
          animation: 'absIn 0.4s ease both',
        }}>
          <ResumoCard
            label="ABS do mês"
            valor={`${absPercent.toFixed(1)}%`}
            cor={absStatus === 'verde' ? '#4ade80' : absStatus === 'amarelo' ? '#fbbf24' : '#f87171'}
            detalhe="meta ≤ 5%"
            progresso={Math.min(100, (absPercent / 8) * 100)}
            progressoCor={absStatus === 'verde' ? '#4ade80' : absStatus === 'amarelo' ? '#fbbf24' : '#f87171'}
          />
          <ResumoCard
            label="faltas no mês"
            valor={String(faltasNoMes)}
            cor={faltasStatus === 'verde' ? '#4ade80' : faltasStatus === 'amarelo' ? '#fbbf24' : '#f87171'}
            detalhe="máximo 1 falta"
            badge={faltasNoMes >= 2 ? { texto: 'RISCO RV', cor: '#f87171', bg: 'rgba(239,68,68,0.12)' } : undefined}
          />
          <SituacaoRVCard elegivel={rvElegivel} />
          <ResumoCard
            label="presenças registradas"
            valor={String(presencasCount)}
            cor="#4ade80"
            detalhe="dias com P"
          />
        </div>

        {/* Seção 2: Calendário */}
        <SectionCard title="Calendário do Mês" delay={100}>
          <CalendarioGrid dias={dias} primeiroDow={primeiroDow} />
          <Legenda />
        </SectionCard>

        {/* Seção 3: Análise */}
        <SectionCard title="Análise e Orientações" delay={200}>
          <AnaliseConteudo absPercent={absPercent} faltasNoMes={faltasNoMes} absStatus={absStatus} />
        </SectionCard>

      </div>
    </>
  )
}

// ── Cards de Resumo ───────────────────────────────────────────────────────────

function ResumoCard({ label, valor, cor, detalhe, progresso, progressoCor, badge }: {
  label: string; valor: string; cor: string; detalhe?: string
  progresso?: number; progressoCor?: string
  badge?: { texto: string; cor: string; bg: string }
}) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '14px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6px' }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '36px', fontWeight: 800, lineHeight: 1,
          color: cor, fontVariantNumeric: 'tabular-nums',
        }}>
          {valor}
        </span>
        {badge && (
          <span style={{
            fontSize: '9px', fontWeight: 700, padding: '3px 7px', borderRadius: '99px',
            background: badge.bg, color: badge.cor,
            border: `1px solid ${badge.cor}33`,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            flexShrink: 0, marginBottom: '4px',
          }}>
            {badge.texto}
          </span>
        )}
      </div>
      {progresso !== undefined && progressoCor && (
        <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(progresso, 100)}%`, borderRadius: '99px',
            background: progressoCor, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      )}
      {detalhe && (
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{detalhe}</span>
      )}
    </div>
  )
}

function SituacaoRVCard({ elegivel }: { elegivel: boolean }) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: `1px solid ${elegivel ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}`,
      borderRadius: '14px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
        situação no rv
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {elegivel
          ? <CheckCircle2 size={28} style={{ color: '#4ade80', flexShrink: 0 }} />
          : <XCircle size={28} style={{ color: '#f87171', flexShrink: 0 }} />}
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '18px', fontWeight: 700,
          color: elegivel ? '#4ade80' : '#f87171',
        }}>
          {elegivel ? 'Elegível' : 'Em risco'}
        </span>
      </div>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
        {elegivel ? 'nenhuma falta que impeça' : '2 ou mais faltas = perde RV'}
      </span>
    </div>
  )
}

// ── Calendário ────────────────────────────────────────────────────────────────

const DIAS_SEMANA_HEADER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function CalendarioGrid({ dias, primeiroDow }: { dias: DiaCalendario[]; primeiroDow: number }) {
  const celulas: (DiaCalendario | null)[] = [
    ...Array<null>(primeiroDow).fill(null),
    ...dias,
  ]
  while (celulas.length % 7 !== 0) celulas.push(null)

  return (
    <div>
      {/* Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
        {DIAS_SEMANA_HEADER.map(h => (
          <div key={h} style={{
            textAlign: 'center', fontSize: '10px', fontWeight: 600,
            color: h === 'Dom' ? 'rgba(255,255,255,0.18)' : 'var(--text-muted)',
            padding: '4px 2px', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {h}
          </div>
        ))}
      </div>
      {/* Células */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {celulas.map((cel, i) =>
          cel === null
            ? <div key={`empty-${i}`} />
            : <DiaCell key={cel.dia} dia={cel} />
        )}
      </div>
    </div>
  )
}

function DiaCell({ dia }: { dia: DiaCalendario }) {
  if (dia.isDomingo) {
    return (
      <div style={{
        minHeight: '44px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.03)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', fontVariantNumeric: 'tabular-nums' }}>
          {dia.dia}
        </span>
      </div>
    )
  }

  const bg = dia.status
    ? (STATUS_BG[dia.status] ?? 'rgba(255,255,255,0.03)')
    : dia.isFuturo ? 'transparent' : 'rgba(255,255,255,0.03)'

  const cor = dia.status ? (STATUS_COLOR[dia.status] ?? 'var(--text-muted)') : 'rgba(255,255,255,0.25)'

  const borderStyle = dia.isHoje
    ? '1.5px solid rgba(201,168,76,0.65)'
    : `1px solid ${dia.status && dia.status !== '-' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`

  return (
    <div
      title={dia.status ? (STATUS_LABEL[dia.status] ?? dia.status) : dia.isFuturo ? '' : 'Não registrado'}
      style={{
        minHeight: '44px', borderRadius: '8px',
        background: bg,
        border: borderStyle,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '2px',
        opacity: dia.isFuturo && !dia.isHoje ? 0.35 : 1,
        cursor: 'default',
      }}
    >
      <span style={{
        fontSize: '10px', fontVariantNumeric: 'tabular-nums',
        color: dia.isHoje ? '#e8c96d' : 'var(--text-muted)',
        fontWeight: dia.isHoje ? 700 : 400,
      }}>
        {dia.dia}
      </span>
      {dia.status && dia.status !== '-' && (
        <span style={{ fontSize: '9px', fontWeight: 700, color: cor, letterSpacing: '0.04em', lineHeight: 1 }}>
          {dia.status}
        </span>
      )}
    </div>
  )
}

function Legenda() {
  return (
    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {LEGENDA_ITEMS.map(({ sigla, label, cor }) => (
        <div key={sigla} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{
            width: '18px', height: '18px', borderRadius: '5px',
            background: STATUS_BG[sigla] ?? 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '8px', fontWeight: 700, color: cor }}>{sigla}</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Análise ───────────────────────────────────────────────────────────────────

function AnaliseConteudo({ absPercent, faltasNoMes, absStatus }: {
  absPercent: number; faltasNoMes: number; absStatus: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Banner principal */}
      {faltasNoMes >= 2 ? (
        <Banner
          tipo="vermelho"
          titulo="⚠ Seu RV está em risco!"
          texto={`Você tem ${faltasNoMes} faltas este mês. Com 2 ou mais faltas você perde a elegibilidade ao RV.`}
        />
      ) : faltasNoMes === 1 ? (
        <Banner
          tipo="amarelo"
          titulo="⚠ Atenção — 1 falta registrada"
          texto="Mais 1 falta este mês e você perde o RV. Fique atento!"
        />
      ) : absStatus !== 'verde' ? (
        <Banner
          tipo={absStatus === 'vermelho' ? 'vermelho' : 'amarelo'}
          titulo={absStatus === 'vermelho' ? '⚠ ABS acima da meta!' : '⚠ ABS em zona de atenção'}
          texto={`Seu ABS está em ${absPercent.toFixed(1)}%. A meta é ≤ 5%.${absStatus === 'vermelho' ? ' Isso pode impactar seu RV.' : ''}`}
        />
      ) : (
        <Banner
          tipo="verde"
          titulo="✓ Situação regular"
          texto="Suas presenças estão dentro do esperado. Continue assim!"
        />
      )}

      {/* Dicas gerais */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
        <Dica texto="Registre ausências com antecedência quando possível" />
        <Dica texto="Dúvidas sobre seu registro? Fale com a gestão" />
      </div>
    </div>
  )
}

function Banner({ tipo, titulo, texto }: { tipo: 'verde' | 'amarelo' | 'vermelho'; titulo: string; texto: string }) {
  const styles = {
    verde:    { bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.20)',  titleColor: '#4ade80',  textColor: '#86efac' },
    amarelo:  { bg: 'rgba(234,179,8,0.07)',  border: 'rgba(234,179,8,0.20)',  titleColor: '#fbbf24',  textColor: '#fde047' },
    vermelho: { bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.20)',  titleColor: '#f87171',  textColor: '#fca5a5' },
  }
  const s = styles[tipo]

  return (
    <div style={{
      padding: '14px 16px', borderRadius: '12px',
      background: s.bg, border: `1px solid ${s.border}`,
    }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: s.titleColor, marginBottom: '5px' }}>{titulo}</p>
      <p style={{ fontSize: '12px', color: s.textColor, lineHeight: 1.5 }}>{texto}</p>
    </div>
  )
}

function Dica({ texto }: { texto: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <Info size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }} />
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{texto}</span>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function SectionCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <div style={{
      background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '16px', padding: '20px',
      animation: 'absIn 0.4s ease both', animationDelay: `${delay}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: '#c9a84c',
        }}>
          {title}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
      </div>
      {children}
    </div>
  )
}
