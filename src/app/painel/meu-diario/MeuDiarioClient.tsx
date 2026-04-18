'use client'

import { useState } from 'react'
import { FileText, Clock, AlertTriangle, Ticket, Info, ChevronDown } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface RegistroExibir {
  tipo:         string
  observacoes:  string
  glpi:         string
  tempoMin:     number
  tempoFmt:     string
  data:         string   // "DD/MM/YYYY"
  dataFmt:      string   // "Seg, 14 abr"
}

export interface TipoCount {
  tipo:  string
  count: number
}

export interface MeuDiarioProps {
  nomeOperador:        string
  mesLabel:            string
  totalRegistros:      number
  totalPausasMin:      number
  totalForaJornadaMin: number
  totalComGlpi:        number
  porTipo:             TipoCount[]
  registros:           RegistroExibir[]
}

// ── Constantes de cores por tipo ──────────────────────────────────────────────

const TIPO_COLOR: Record<string, string> = {
  'Pausa justificada': '#f59e0b',
  'Fora da jornada':   '#60a5fa',
  'Geral':             '#a78bfa',
  'Outros':            '#94a3b8',
}

const TIPO_BG: Record<string, string> = {
  'Pausa justificada': 'rgba(245,158,11,0.10)',
  'Fora da jornada':   'rgba(96,165,250,0.10)',
  'Geral':             'rgba(167,139,250,0.10)',
  'Outros':            'rgba(148,163,184,0.08)',
}

const TIPO_BD: Record<string, string> = {
  'Pausa justificada': 'rgba(245,158,11,0.22)',
  'Fora da jornada':   'rgba(96,165,250,0.22)',
  'Geral':             'rgba(167,139,250,0.22)',
  'Outros':            'rgba(148,163,184,0.15)',
}

function tipoColor(tipo: string) { return TIPO_COLOR[tipo] ?? '#94a3b8' }
function tipoBg(tipo: string)    { return TIPO_BG[tipo]    ?? 'rgba(148,163,184,0.08)' }
function tipoBd(tipo: string)    { return TIPO_BD[tipo]    ?? 'rgba(148,163,184,0.15)' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMin(min: number): string {
  if (min <= 0) return '0 min'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function Fade({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <div style={{ animation: `diarioFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '14px',
      padding: '16px 18px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '10px',
    }}>
      {children}
    </p>
  )
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
      background: tipoBg(tipo), border: `1px solid ${tipoBd(tipo)}`,
      color: tipoColor(tipo), whiteSpace: 'nowrap',
    }}>
      {tipo}
    </span>
  )
}

// ── SEÇÃO 1 — Cards Resumo ────────────────────────────────────────────────────

interface ResumoCardProps {
  icon: React.ElementType
  valor: string
  label: string
  cor?: string
}

function ResumoCard({ icon: Icon, valor, label, cor = 'var(--text-primary)' }: ResumoCardProps) {
  return (
    <div style={{
      flex: '1 1 100px',
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '14px',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <Icon size={15} style={{ color: 'var(--text-muted)' }} />
      <p style={{ fontFamily: 'var(--ff-display)', fontSize: '28px', fontWeight: 700, color: cor, lineHeight: 1 }}>
        {valor}
      </p>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{label}</p>
    </div>
  )
}

function CardsResumo(p: MeuDiarioProps) {
  const pausasCor = p.totalPausasMin > 120 ? '#facc15' : '#4ade80'
  const foraCor   = p.totalForaJornadaMin > 0 ? '#f87171' : '#4ade80'
  const glpiCor   = p.totalComGlpi > 0 ? 'var(--gold)' : 'var(--text-muted)'

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <ResumoCard icon={FileText} valor={String(p.totalRegistros)} label="registros este mês" />
      <ResumoCard icon={Clock}    valor={formatMin(p.totalPausasMin)}      label="em pausas justificadas" cor={pausasCor} />
      <ResumoCard icon={AlertTriangle} valor={formatMin(p.totalForaJornadaMin)} label="fora da jornada"  cor={foraCor} />
      <ResumoCard icon={Ticket}   valor={String(p.totalComGlpi)} label="chamados vinculados" cor={glpiCor} />
    </div>
  )
}

// ── SEÇÃO 2 — Distribuição por Tipo ──────────────────────────────────────────

function DistribuicaoTipos(p: MeuDiarioProps) {
  const total = p.totalRegistros
  if (total === 0) return null

  return (
    <Card>
      <SectionHeading>Distribuição por Tipo</SectionHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {p.porTipo.map(({ tipo, count }) => {
          const pct = Math.round(count / total * 100)
          return (
            <div key={tipo}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <TipoBadge tipo={tipo} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {count} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
                </span>
              </div>
              <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  width: `${pct}%`,
                  background: tipoColor(tipo),
                  transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                  opacity: 0.7,
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── SEÇÃO 3 — Timeline ────────────────────────────────────────────────────────

function TimelineItem({ r }: { r: RegistroExibir }) {
  const cor = tipoColor(r.tipo)

  return (
    <div style={{ display: 'flex', gap: '14px' }}>
      {/* Linha lateral */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '16px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cor, flexShrink: 0, marginTop: '4px' }} />
        <div style={{ flex: 1, width: '2px', background: `${cor}22`, minHeight: '20px', marginTop: '4px' }} />
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, paddingBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{
            fontFamily: 'var(--ff-display)', fontSize: '12px', fontWeight: 600,
            color: 'var(--gold)', letterSpacing: '0.04em',
          }}>
            {r.dataFmt}
          </span>
          <TipoBadge tipo={r.tipo} />
          {r.tempoMin > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              · {r.tempoFmt}
            </span>
          )}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: r.glpi ? '6px' : 0 }}>
          {r.observacoes}
        </p>

        {r.glpi && (
          <span style={{
            fontSize: '11px', fontFamily: 'monospace',
            padding: '1px 7px', borderRadius: '5px',
            background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)',
            color: 'var(--gold)',
          }}>
            GLPI #{r.glpi}
          </span>
        )}
      </div>
    </div>
  )
}

function Timeline({ registros }: { registros: RegistroExibir[] }) {
  if (registros.length === 0) {
    return (
      <Card>
        <SectionHeading>Registros do Mês</SectionHeading>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          Nenhum registro este mês.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <SectionHeading>Registros do Mês ({registros.length})</SectionHeading>
      <div>
        {registros.map((r, i) => (
          <TimelineItem key={i} r={r} />
        ))}
      </div>
    </Card>
  )
}

// ── SEÇÃO 4 — Aviso rodapé ───────────────────────────────────────────────────

function AvisoRodape() {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '12px 16px', borderRadius: '12px',
      background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.10)',
    }}>
      <Info size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }} />
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Para solicitar correções ou novos registros, entre em contato com a supervisão:{' '}
        <span style={{ color: 'var(--text-secondary)' }}>Caio Vinicius · Sara Secundo · Barbara Vilela</span>
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MeuDiarioClient(p: MeuDiarioProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes diarioFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Fade delay={0}><CardsResumo {...p} /></Fade>
        {p.porTipo.length > 0 && <Fade delay={60}><DistribuicaoTipos {...p} /></Fade>}
        <Fade delay={120}><Timeline registros={p.registros} /></Fade>
        <Fade delay={180}><AvisoRodape /></Fade>
      </div>
    </>
  )
}
