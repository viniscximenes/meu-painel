'use client'

'use client'

import { Shield, Clock, Flame, Activity, Calendar, type LucideIcon } from 'lucide-react'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { MeuKpiSectionTitle } from '@/components/kpi-individual/MeuKpiCard'
import { BannerAguardandoKPI } from '@/components/painel/BannerAguardandoKPI'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface QuartilTopicoData {
  id:               string
  nomeTopico:       string
  quartil:          1 | 2 | 3 | 4 | null
  metricaFormatada: string | null
  rankGlobal:       number | null
  totalOperadores:  number
}

export interface MeuQuartilProps {
  mesLabel:        string
  dataAtualizacao: string | null
  topicos:         QuartilTopicoData[]
  modoHistorico?:  boolean
}

// ── Paleta semântica por quartil ──────────────────────────────────────────────

const QUARTIL_COR: Record<1 | 2 | 3 | 4, string> = {
  1: 'rgba(106,196,73,0.62)',
  2: 'rgba(255,193,60,0.62)',
  3: 'rgba(224,83,31,0.62)',
  4: 'rgba(224,31,31,0.62)',
}

// ── Config visual por tópico ──────────────────────────────────────────────────

interface TopicoVisual {
  Icon:       LucideIcon
  nomeCard:   string
  labelDados: string
}

const TOPICO_VISUAL: Record<string, TopicoVisual> = {
  txretencao: { Icon: Shield,   nomeCard: 'TAXA DE RETENÇÃO',  labelDados: 'TX. RETENÇÃO'  },
  tma:        { Icon: Clock,    nomeCard: 'TMA',               labelDados: 'TMA'            },
  churn:      { Icon: Flame,    nomeCard: 'CANCELADOS',        labelDados: 'CANCELADOS'     },
  abs:        { Icon: Calendar, nomeCard: 'ABS',               labelDados: 'ABS'            },
  indisp:     { Icon: Activity, nomeCard: 'INDISPONIBILIDADE', labelDados: 'INDISPONIB.'    },
}

// ── Tokens ────────────────────────────────────────────────────────────────────

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

const COR_NEUTRO  = '#A6A2A2'
const COR_DASH    = '#474658'
const COR_DIVISOR = '#211F3C'

// ── Card ─────────────────────────────────────────────────────────────────────

function QuartilTopicoCard({ topico }: { topico: QuartilTopicoData }) {
  const visual = TOPICO_VISUAL[topico.id]
    ?? { Icon: Shield, nomeCard: topico.id.toUpperCase(), labelDados: topico.id.toUpperCase() }
  const { Icon, nomeCard, labelDados } = visual

  const temDados = topico.quartil !== null
  const cor      = temDados ? QUARTIL_COR[topico.quartil!] : COR_NEUTRO

  return (
    <div style={{
      position:     'relative',
      background:   '#070714',
      border:       '1px solid rgba(255,185,34,0.25)',
      borderRadius: '20px',
      height:       '186px',
      width:        '100%',
      overflow:     'hidden',
    }}>

      {/* ── Ícone — top 14, left 14, 38×41 ────────────────── */}
      <div style={{
        position:       'absolute',
        top:            '18px',
        left:           '14px',
        width:          '44px',
        height:         '44px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
      }}>
        <Icon size={44} style={{ color: cor }} />
      </div>

      {/* ── Título — top 12, left 66, height 44 ────────────── */}
      <div style={{
        position:      'absolute',
        top:           '18px',
        left:          '72px',
        height:        '44px',
        display:       'flex',
        alignItems:    'center',
        fontFamily:    FF_SYNE,
        fontWeight:    700,
        fontSize:      '28px',
        lineHeight:    1,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        color:         cor,
        whiteSpace:    'nowrap',
      }}>
        {nomeCard}
      </div>

      {/* ── Q grande — top 56 (12+44), left 14 ────────────── */}
      <div style={{
        position:            'absolute',
        top:                 '62px',
        left:                '14px',
        fontFamily:          FF_DM,
        fontSize:            '112px',
        fontWeight:          900,
        lineHeight:          1,
        fontVariantNumeric:  'tabular-nums',
        fontFeatureSettings: "'tnum'",
        color:               temDados ? cor : COR_DASH,
      }}>
        {temDados ? `Q${topico.quartil}` : '—'}
      </div>

      {/* ── Divisória vertical — posição fixa 360px ─────────── */}
      <div style={{
        position:   'absolute',
        left:       '460px',
        top:        '14px',
        bottom:     '14px',
        width:      '2px',
        background: COR_DIVISOR,
      }} />

      {/* ── Lado direito ───────────────────────────────────── */}
      <div style={{
        position:       'absolute',
        top:            '14px',
        left:           '480px',
        right:          '28px',
        bottom:         '14px',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'flex-end',
        justifyContent: 'flex-start',
      }}>

        {/* Rank + linha de apoio — largura limitada ao texto */}
        <div style={{ width: 'fit-content' }}>
          <div style={{
            fontFamily:          FF_DM,
            fontSize:            '48px',
            fontWeight:          900,
            color:               '#72708F',
            fontVariantNumeric:  'tabular-nums',
            fontFeatureSettings: "'tnum'",
            lineHeight:          1,
          }}>
            {topico.rankGlobal !== null
              ? <>{topico.rankGlobal}º – {topico.totalOperadores}</>
              : <span style={{ color: COR_DASH }}>—</span>
            }
          </div>
          <div style={{ width: '100%', height: '2px', background: '#72708F', marginTop: '0', marginBottom: '4px' }} />
        </div>

        {/* Label + valor */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '0' }}>
          <span style={{
            fontFamily:    FF_SYNE,
            fontSize:      '16px',
            fontWeight:    600,
            textTransform: 'uppercase',
            color:         '#72708F',
          }}>
            {labelDados}:
          </span>
          <span style={{
            fontFamily:          FF_DM,
            fontSize:            '16px',
            fontWeight:          700,
            color:               '#72708F',
            fontVariantNumeric:  'tabular-nums',
          }}>
            {topico.metricaFormatada !== null ? topico.metricaFormatada : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MeuQuartilClient({ mesLabel, dataAtualizacao, topicos, modoHistorico }: MeuQuartilProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .mkpi-bg {
          background-color: #01020a;
          background-image:
            linear-gradient(to right, rgba(244,212,124,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(244,212,124,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
      `}} />

      <div className="mkpi-bg">
        <PainelHeader
          titulo="MEU QUARTIL"
          mesLabel={modoHistorico ? 'AGUARDANDO KPI' : mesLabel}
          dataReferencia={modoHistorico ? null : dataAtualizacao}
        />
        <LinhaHorizontalDourada />

        {modoHistorico ? (
          <BannerAguardandoKPI
            texto="O quartil será disponibilizado quando o KPI do mês atual for liberado."
          />
        ) : (
          <div>
            <MeuKpiSectionTitle>RESULTADO POR TÓPICO</MeuKpiSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {topicos.map(t => <QuartilTopicoCard key={t.id} topico={t} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
