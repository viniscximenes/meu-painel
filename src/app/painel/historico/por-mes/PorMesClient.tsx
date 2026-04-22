'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, ChevronDown, Calendar,
  BarChart2, UserX, AlertCircle, RefreshCw,
  Shield, Clock, XCircle, Package, CalendarX, Activity,
} from 'lucide-react'

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface KpiMesData {
  encontrado: boolean
  principais: { label: string; valor: string }[]
  complementares: { label: string; valor: string }[]
}

export interface MesDisponivel {
  mes: number
  ano: number
  label: string       // 'MARÇO 2026'
  labelCurto: string  // 'MAR 2026'
}

export interface PorMesProps {
  mesesDisponiveis: MesDisponivel[]
  kpiPorMes: Record<string, KpiMesData>
  mesPadrao: { mes: number; ano: number }
  errorMessage?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function iconFor(label: string, size = 14) {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return <Shield size={size} />
  if (l.includes('tma') || l.includes('tempo'))      return <Clock size={size} />
  if (l.includes('churn') || l.includes('cancel'))   return <XCircle size={size} />
  if (l.includes('pedido'))                          return <Package size={size} />
  if (l === 'abs' || l.startsWith('abs'))            return <CalendarX size={size} />
  if (l.includes('indisp'))                          return <Activity size={size} />
  return <Activity size={size} />
}

function formatarValor(label: string, valor: string): string {
  if (!valor || valor === '—') return valor
  const l = label.toLowerCase()
  if (l.includes('tma') || l.includes('tempo')) {
    const parts = valor.split(':').map(p => parseInt(p, 10))
    if (parts.some(Number.isNaN)) return valor
    let h = 0, m = 0, s = 0
    if (parts.length === 3) { [h, m, s] = parts }
    else if (parts.length === 2) { [m, s] = parts }
    else return valor
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  if (valor.includes('%')) {
    return valor.replace('.', ',')
  }
  return valor
}

// ── Card de métrica (linguagem Trimestre) ─────────────────────────────────────

function MetricaCard({ label, valor }: { label: string; valor: string }) {
  const semDados = !valor || valor === '—'
  const valorFmt = semDados ? '—' : formatarValor(label, valor)
  return (
    <div className="pm-card">
      <div className="pm-card-label">
        <span className="pm-card-icon">{iconFor(label, 14)}</span>
        <span>{label}</span>
      </div>
      <div
        className="pm-card-valor"
        style={{ color: semDados ? 'rgba(255,255,255,0.28)' : undefined }}
      >
        {valorFmt}
      </div>
    </div>
  )
}

// ── Header do mês (linguagem Trimestre) ───────────────────────────────────────

function MesHeader({ label }: { label: string }) {
  return (
    <div className="pm-mes-header">
      <Calendar size={16} style={{ color: 'rgba(244,212,124,0.65)', flexShrink: 0 }} />
      <h2 className="pm-mes-titulo">{label}</h2>
    </div>
  )
}

// ── Dados complementares (accordion limpo) ────────────────────────────────────

function DadosComplementares({ itens }: { itens: { label: string; valor: string }[] }) {
  const [open, setOpen] = useState(false)
  if (!itens.length) return null
  return (
    <div className="pm-complementares">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="pm-complementares-btn"
      >
        <span className="pm-complementares-titulo">Dados Complementares</span>
        <span className="pm-complementares-count">
          {itens.length} {itens.length === 1 ? 'métrica' : 'métricas'}
        </span>
        <ChevronDown
          size={13}
          style={{
            color: 'rgba(255,255,255,0.40)',
            flexShrink: 0,
            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? '600px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="pm-complementares-lista">
          {itens.map((c, i) => (
            <div
              key={c.label}
              className="pm-complementares-linha"
              style={{
                borderBottom:
                  i === itens.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span className="pm-complementares-label">{c.label}</span>
              <span className="pm-complementares-valor">{formatarValor(c.label, c.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PorMesClient({ mesesDisponiveis, kpiPorMes, mesPadrao, errorMessage }: PorMesProps) {
  const router = useRouter()
  const [selecionado, setSelecionado] = useState(mesPadrao)

  const navegar = useCallback((mes: number, ano: number) => {
    setSelecionado({ mes, ano })
    router.replace(`/painel/historico/por-mes?mes=${mes}&ano=${ano}`, { scroll: false })
  }, [router])

  // ── Derivações ──────────────────────────────────────────────────────────────
  const idxAtual = mesesDisponiveis.findIndex(
    m => m.mes === selecionado.mes && m.ano === selecionado.ano
  )
  const mesAtualObj     = idxAtual >= 0 ? mesesDisponiveis[idxAtual] : mesesDisponiveis[mesesDisponiveis.length - 1]
  const mesAnteriorObj  = idxAtual > 0 ? mesesDisponiveis[idxAtual - 1] : null
  const mesPosteriorObj = idxAtual < mesesDisponiveis.length - 1 ? mesesDisponiveis[idxAtual + 1] : null

  const chaveAtual = `${selecionado.mes}-${selecionado.ano}`
  const kpiAtual   = kpiPorMes[chaveAtual] ?? null

  // ── Estado de erro técnico ──────────────────────────────────────────────────
  if (errorMessage) {
    return (
      <div className="space-y-4 login-grid-bg">
        <PorMesStyles />
        <GoldLine />
        <PageHeader total={0} />
        <div className="pm-empty">
          <AlertCircle size={32} style={{ color: 'rgba(244,212,124,0.50)' }} />
          <p className="pm-empty-titulo">{errorMessage}</p>
          <button
            type="button"
            className="pm-retry-btn"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ── Estado vazio global ─────────────────────────────────────────────────────
  if (mesesDisponiveis.length === 0) {
    return (
      <div className="space-y-4 login-grid-bg">
        <PorMesStyles />
        <GoldLine />
        <PageHeader total={0} />
        <div className="pm-empty">
          <BarChart2 size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="pm-empty-titulo">Nenhum mês fechado disponível ainda</p>
          <p className="pm-empty-sub">
            Peça ao gestor para associar planilhas fechadas ao histórico em Configurações.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 login-grid-bg">
      <PorMesStyles />
      <GoldLine />
      <PageHeader total={mesesDisponiveis.length} />

      {/* Seletor de mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          className="pm-nav-btn"
          disabled={!mesAnteriorObj}
          onClick={() => mesAnteriorObj && navegar(mesAnteriorObj.mes, mesAnteriorObj.ano)}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="pm-select-wrap">
          <select
            value={`${selecionado.mes}-${selecionado.ano}`}
            onChange={e => {
              const [mes, ano] = e.target.value.split('-').map(Number)
              navegar(mes, ano)
            }}
            className="pm-select"
          >
            {[...mesesDisponiveis].reverse().map(m => (
              <option
                key={`${m.mes}-${m.ano}`}
                value={`${m.mes}-${m.ano}`}
                style={{ background: '#0c1018', textTransform: 'uppercase' }}
              >
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: 'absolute', right: '10px', top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(244,212,124,0.7)', pointerEvents: 'none',
            }}
          />
        </div>

        <button
          type="button"
          className="pm-nav-btn"
          disabled={!mesPosteriorObj}
          onClick={() => mesPosteriorObj && navegar(mesPosteriorObj.mes, mesPosteriorObj.ano)}
          aria-label="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Conteúdo (key força fade ao trocar mês) */}
      <div key={chaveAtual} className="pm-fade-keyed" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header do mês selecionado */}
        {mesAtualObj && <MesHeader label={mesAtualObj.label} />}

        {/* Operador não encontrado */}
        {kpiAtual && !kpiAtual.encontrado && (
          <div className="pm-empty">
            <UserX size={32} style={{ color: 'rgba(255,255,255,0.18)' }} />
            <p className="pm-empty-titulo">Você não estava na empresa neste mês</p>
            <p className="pm-empty-sub">
              Nenhuma linha encontrada para {mesAtualObj?.label ?? 'este mês'}.
            </p>
          </div>
        )}

        {/* KPIs Principais */}
        {kpiAtual?.encontrado && kpiAtual.principais.length > 0 && (
          <div className="pm-cards">
            {kpiAtual.principais.map(k => (
              <MetricaCard key={k.label} label={k.label} valor={k.valor} />
            ))}
          </div>
        )}

        {/* Dados Complementares */}
        {kpiAtual?.encontrado && kpiAtual.complementares.length > 0 && (
          <DadosComplementares itens={kpiAtual.complementares} />
        )}

        {/* Navegação inferior */}
        <NavInferior
          mesAnteriorObj={mesAnteriorObj}
          mesPosteriorObj={mesPosteriorObj}
          navegar={navegar}
        />
      </div>
    </div>
  )
}

// ── Navegação inferior ────────────────────────────────────────────────────────

function NavInferior({
  mesAnteriorObj, mesPosteriorObj, navegar,
}: {
  mesAnteriorObj: MesDisponivel | null
  mesPosteriorObj: MesDisponivel | null
  navegar: (mes: number, ano: number) => void
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
      {mesAnteriorObj ? (
        <button
          type="button"
          className="pm-nav-footer-btn"
          onClick={() => navegar(mesAnteriorObj.mes, mesAnteriorObj.ano)}
        >
          <ChevronLeft size={14} />
          {mesAnteriorObj.labelCurto}
        </button>
      ) : <div />}
      {mesPosteriorObj ? (
        <button
          type="button"
          className="pm-nav-footer-btn"
          onClick={() => navegar(mesPosteriorObj.mes, mesPosteriorObj.ano)}
        >
          {mesPosteriorObj.labelCurto}
          <ChevronRight size={14} />
        </button>
      ) : <div />}
    </div>
  )
}

// ── Helpers visuais ───────────────────────────────────────────────────────────

function GoldLine() {
  return (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
    }} />
  )
}

function PageHeader({ total }: { total: number }) {
  return (
    <div className="pm-page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span className="pm-page-titulo">Por Mês</span>
        <div style={{ width: '1px', height: '14px', background: 'rgba(201,168,76,0.2)' }} />
        <span className="pm-page-count">
          {total} {total === 1 ? 'mês fechado disponível' : 'meses fechados disponíveis'}
        </span>
      </div>
      <p className="pm-page-sub">
        Selecione um mês fechado para ver o desempenho completo.
      </p>
    </div>
  )
}

// ── Estilos (escopo `.pm-`) ───────────────────────────────────────────────────

function PorMesStyles() {
  return (
    <style>{`
      @keyframes pmFade {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .pm-fade-keyed { animation: pmFade 0.15s ease both; }

      /* Header geral */
      .pm-page-header {
        background: linear-gradient(90deg, #0c0f16 0%, #0a0d13 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
        border-radius: 12px;
        padding: 14px 20px;
        display: flex; flex-direction: column; gap: 6px;
      }
      .pm-page-titulo {
        font-family: var(--ff-display);
        font-size: 15px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.06em;
        background: linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .pm-page-count {
        font-family: var(--ff-body);
        font-size: 11px; color: rgba(255,255,255,0.55);
      }
      .pm-page-sub {
        font-family: var(--ff-body);
        font-size: 12px; color: rgba(255,255,255,0.35);
        margin: 0;
      }

      /* Header do mês selecionado */
      .pm-mes-header {
        display: flex; align-items: center; gap: 14px;
        padding: 14px 18px;
        border-radius: 10px;
        background: linear-gradient(90deg, #0c0f16 0%, #0a0d13 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
      }
      .pm-mes-titulo {
        font-family: var(--ff-body);
        font-size: 20px; font-weight: 400; letter-spacing: 0.12em;
        text-transform: uppercase; color: #f4d47c;
        font-variant-numeric: normal;
        font-feature-settings: normal;
        margin: 0;
      }

      /* Cards de métrica */
      .pm-cards { display: flex; flex-direction: column; gap: 6px; }
      .pm-card {
        display: flex; align-items: center; justify-content: space-between;
        gap: 14px;
        padding: 9px 18px;
        border-radius: 8px;
        border: 1px solid rgba(201, 168, 76, 0.10);
        background: linear-gradient(to right, #15181f 0%, #0f1219 100%);
        transition: background 0.2s ease, border-color 0.2s ease;
      }
      .pm-card:hover {
        background: linear-gradient(to right, #1a1e27 0%, #13161e 100%);
        border-color: rgba(201, 168, 76, 0.18);
      }
      .pm-card-label {
        display: flex; align-items: center; gap: 8px;
        font-family: var(--ff-body);
        font-size: 14px; font-weight: 500; letter-spacing: 0.10em;
        text-transform: uppercase; color: #d4d4d8;
        min-width: 168px; flex-shrink: 0;
      }
      .pm-card-icon { display: inline-flex; color: rgba(255,255,255,0.50); }
      .pm-card-valor {
        font-family: var(--ff-body);
        font-size: 14px; font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0;
        line-height: 1;
        color: #d4d4d8;
        margin-left: auto;
      }

      /* Seletor de mês */
      .pm-nav-btn {
        display: flex; align-items: center; justify-content: center;
        width: 36px; height: 36px; border-radius: 8px;
        background: linear-gradient(to right, #15181f 0%, #0f1219 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
        color: rgba(255,255,255,0.55);
        cursor: pointer;
        transition: all 0.15s ease; flex-shrink: 0;
      }
      .pm-nav-btn:hover:not(:disabled) {
        border-color: rgba(201, 168, 76, 0.25);
        color: rgba(255,255,255,0.90);
      }
      .pm-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

      .pm-select-wrap { position: relative; flex: 1; max-width: 280px; }
      .pm-select {
        width: 100%; appearance: none;
        background: linear-gradient(to right, #15181f 0%, #0f1219 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
        border-radius: 8px; color: rgba(255,255,255,0.90);
        padding: 9px 36px 9px 14px;
        font-family: var(--ff-body);
        font-size: 13px; font-weight: 500; letter-spacing: 0.05em;
        text-transform: uppercase; cursor: pointer;
        transition: border-color 0.15s ease;
      }
      .pm-select:hover { border-color: rgba(201, 168, 76, 0.25); }

      /* Navegação inferior */
      .pm-nav-footer-btn {
        display: flex; align-items: center; gap: 6px;
        padding: 10px 16px; border-radius: 8px;
        background: linear-gradient(to right, #15181f 0%, #0f1219 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
        color: rgba(255,255,255,0.70);
        font-family: var(--ff-body);
        font-size: 12px; font-weight: 500;
        cursor: pointer; transition: all 0.15s ease;
      }
      .pm-nav-footer-btn:hover {
        border-color: rgba(201, 168, 76, 0.25);
        color: rgba(255,255,255,0.90);
      }

      /* Dados complementares */
      .pm-complementares {
        background: linear-gradient(to right, #15181f 0%, #0f1219 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
        border-radius: 10px;
        overflow: hidden;
      }
      .pm-complementares-btn {
        width: 100%; display: flex; align-items: center; gap: 8px;
        padding: 14px 18px;
        background: transparent;
        border: none; cursor: pointer; text-align: left;
        font-family: var(--ff-body);
      }
      .pm-complementares-titulo {
        font-family: var(--ff-body);
        font-size: 12px; font-weight: 500; letter-spacing: 0.12em;
        text-transform: uppercase; color: #d4d4d8; flex: 1;
      }
      .pm-complementares-count {
        font-family: var(--ff-body);
        font-size: 10px; color: rgba(255,255,255,0.40);
        margin-right: 4px;
      }
      .pm-complementares-lista { padding: 4px 18px 14px; }
      .pm-complementares-linha {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 0;
      }
      .pm-complementares-label {
        font-family: var(--ff-body);
        font-size: 13px; color: rgba(255,255,255,0.72); flex: 1;
      }
      .pm-complementares-valor {
        font-family: var(--ff-body);
        font-size: 14px; font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: #d4d4d8;
        min-width: 58px; text-align: right;
      }

      /* Empty state */
      .pm-empty {
        background: linear-gradient(to right, #15181f 0%, #0f1219 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
        border-radius: 12px; padding: 48px 24px; text-align: center;
        display: flex; flex-direction: column; align-items: center; gap: 12px;
      }
      .pm-empty-titulo {
        font-family: var(--ff-body);
        font-size: 14px; font-weight: 500;
        color: rgba(255,255,255,0.55); margin: 0;
      }
      .pm-empty-sub {
        font-family: var(--ff-body);
        font-size: 12px; color: rgba(255,255,255,0.30); margin: 0;
      }
      .pm-retry-btn {
        display: inline-flex; align-items: center; gap: 6px;
        margin-top: 4px; padding: 8px 16px; border-radius: 8px;
        background: linear-gradient(to right, #15181f 0%, #0f1219 100%);
        border: 1px solid rgba(201, 168, 76, 0.20);
        color: rgba(255,255,255,0.70);
        font-family: var(--ff-body); font-size: 12px; font-weight: 500;
        cursor: pointer; transition: all 0.15s ease;
      }
      .pm-retry-btn:hover {
        border-color: rgba(201, 168, 76, 0.40);
        color: rgba(255,255,255,0.90);
      }

      @media (max-width: 768px) {
        .pm-card { gap: 10px; padding: 8px 14px; }
        .pm-card-label { min-width: 120px; font-size: 12px; }
        .pm-card-valor { font-size: 13px; }
        .pm-mes-header { padding: 12px 14px; }
        .pm-mes-titulo { font-size: 18px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .pm-fade-keyed, .pm-card, .pm-nav-btn, .pm-nav-footer-btn {
          animation: none; transition: none;
        }
      }
    `}</style>
  )
}
