import React from 'react'
import {
  Document, Page, View, Text, StyleSheet,
  Svg, Rect, Line,
  Text as _SvgTextBase,
  Font,
} from '@react-pdf/renderer'
import type { PdfData, PdfRegistro } from '@/lib/pdf-data-builder'

// ── Hyphenation — MUST be before Font.register ────────────────────────────────
Font.registerHyphenationCallback((word) => [word])

// ── Font registration ─────────────────────────────────────────────────────────
const BASE = typeof window !== 'undefined' ? window.location.origin : ''
Font.register({ family: 'Syne', src: `${BASE}/fonts/Syne-SemiBold.ttf`, fontWeight: 600 })
Font.register({
  family: 'DMSans',
  fonts: [
    { src: `${BASE}/fonts/DMSans-Regular.ttf`, fontWeight: 400 },
    { src: `${BASE}/fonts/DMSans-Medium.ttf`,  fontWeight: 500 },
    { src: `${BASE}/fonts/DMSans-Bold.ttf`,    fontWeight: 700 },
    { src: `${BASE}/fonts/DMSans-Black.ttf`,   fontWeight: 900 },
  ],
})

// SVG <Text> doesn't expose fontSize/fontFamily via TS — local alias
const SvgText = _SvgTextBase as unknown as React.ComponentType<{
  x: number | string; y: number | string
  fill?: string; fontSize?: number | string
  fontWeight?: number | string; fontFamily?: string
  textAnchor?: 'start' | 'middle' | 'end'
  children?: React.ReactNode
}>

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  white:    '#FFFFFF',
  text:     '#1a1a2e',
  secondary:'#5a5870',
  muted:    '#8a8898',
  divider:  '#d4d2dc',
  gold:     '#c9a24a',
  goldBg:   '#fdf8ec',
  red:      '#c0392b',
  green:    '#2d8a3e',
  yellow:   '#d4a017',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt2 = (n: number) => n.toFixed(2).replace('.', ',')

function absColor(v: number | null)   { return v === null ? C.text : v > 5    ? C.red : C.green }
function indispColor(v: number | null){ return v === null ? C.text : v > 14.5 ? C.red : C.green }
function tipoColor(tipo: string) {
  if (tipo === 'Pausa justificada') return C.green
  if (tipo === 'Fora da jornada')   return C.yellow
  return C.text
}

/** "ABRIL DE 2026" → "Abril de 2026" */
function mesExt(s: string) {
  return s.split(' ').map((w, i) => i === 0 ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase()).join(' ')
}

/** NBSP between hour and minutes prevents hyphenation mid-string */
function safeTime(s: string) { return s.replace(/(\d+h) (\d+min)/g, '$1 $2') }

/**
 * MUDANÇA 5 — Split description text into Syne/DMSans segments.
 * Numbers, times, percentages and dates render in DMSans Medium;
 * surrounding prose remains in Syne (inherited from parent Text style).
 */
function renderDesc(text: string): React.ReactNode[] {
  const NUM_RE = /(\d{1,2}:\d{2}(?::\d{2})?|\d+h[  ]?\d+min|\d+min|\d+,\d+%|\d+%|\d{2}\/\d{2}\/\d{4}|\d+)/g
  const out: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = NUM_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push(<Text key={`t${last}`}>{text.slice(last, m.index)}</Text>)
    }
    out.push(
      <Text key={`n${m.index}`} style={{ fontFamily: 'DMSans', fontWeight: 500 }}>
        {m[0]}
      </Text>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(<Text key={`t${last}`}>{text.slice(last)}</Text>)
  return out.length > 0 ? out : [<Text key="all">{text}</Text>]
}

// ── StyleSheet ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Syne',
    backgroundColor: C.white,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 40,
    fontSize: 9,
    color: C.text,
  },

  // Footer (fixed, all pages)
  footer: { position: 'absolute', bottom: 18, left: 40, right: 40 },
  footerLine: { height: 0.5, backgroundColor: C.divider, marginBottom: 5 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerTextLeft: { fontFamily: 'Syne', fontSize: 7.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: C.muted },
  footerTextRight: { fontFamily: 'DMSans', fontSize: 7.5, fontWeight: 500, color: C.muted },

  // Running header (page 2+)
  runHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 7 },
  runHeaderLine: { height: 0.5, backgroundColor: C.divider, marginBottom: 14 },
  // MUDANÇA 4 base style — year will override fontFamily inline
  runHeaderLeft: { fontFamily: 'Syne', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: C.secondary },

  // Doc header
  docHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  haloText: { fontFamily: 'Syne', fontSize: 32, fontWeight: 600, color: C.gold, letterSpacing: 4.8 },
  docSubtitle: { fontFamily: 'Syne', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: C.secondary, letterSpacing: 2.2, marginTop: 4 },
  docGoldLine: { height: 1, backgroundColor: C.gold, marginBottom: 14 },

  // Operator block
  opName: { fontFamily: 'Syne', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', color: C.text, marginBottom: 4, letterSpacing: 0.32 },
  opEmail: { fontFamily: 'DMSans', fontSize: 11, fontWeight: 500, color: C.secondary, marginBottom: 10 },
  cargoRow: { flexDirection: 'row', gap: 40 },
  cargoBlock: { gap: 3 },
  cargoLabel: { fontFamily: 'Syne', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: C.muted },
  cargoValue: { fontFamily: 'Syne', fontSize: 12, fontWeight: 600, color: C.text },

  subtleDivider: { height: 0.5, backgroundColor: C.divider, marginVertical: 20 },

  // Section
  sectionGap: { marginTop: 32 },
  sectionTitle: { fontFamily: 'Syne', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: C.gold, letterSpacing: 2, marginBottom: 6 },
  sectionLine: { height: 1, backgroundColor: C.gold, marginBottom: 12 },
  sectionSubtitle: { fontFamily: 'Syne', fontSize: 9, fontWeight: 600, color: C.muted, marginBottom: 10 },

  // Two-column layout
  twoCol: { flexDirection: 'row', gap: 24 },
  colKpi: { flex: 9 },
  colContest: { flex: 11 },

  // Table shared
  tableWrap: { borderWidth: 0.5, borderColor: C.divider, borderRadius: 4 },
  tHead: { flexDirection: 'row', backgroundColor: C.goldBg, borderBottomWidth: 0.5, borderBottomColor: C.divider },
  tRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.divider },
  tRowLast: { flexDirection: 'row' },
  tHeadCell: { fontFamily: 'Syne', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: C.muted, paddingVertical: 6, paddingHorizontal: 10 },
  tCellLabel: { fontFamily: 'Syne', fontSize: 11, fontWeight: 600, color: C.text, paddingVertical: 10, paddingHorizontal: 10, flex: 1 },
  tCellValue: { fontFamily: 'DMSans', fontSize: 13, fontWeight: 500, paddingVertical: 10, paddingHorizontal: 10, textAlign: 'right' },
  tCellInputVal: { fontFamily: 'DMSans', fontSize: 11, fontWeight: 500, color: C.text, paddingVertical: 9, paddingHorizontal: 10, textAlign: 'right' },

  // Registros table
  regHeadWrap: {
    flexDirection: 'row',
    backgroundColor: C.goldBg,
    borderTopWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5,
    borderBottomWidth: 0.5, borderColor: C.divider,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },
  regBodyWrap: {
    borderLeftWidth: 0.5, borderRightWidth: 0.5,
    borderBottomWidth: 0.5, borderColor: C.divider,
    borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  regHeadCell: { fontFamily: 'Syne', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4, color: C.muted, paddingVertical: 6, paddingHorizontal: 10 },
  regRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.divider, alignItems: 'center' },
  regRowLast: { flexDirection: 'row', alignItems: 'center' },
  regCellDate: { fontFamily: 'DMSans', fontSize: 11, fontWeight: 500, color: C.text, paddingVertical: 12, paddingHorizontal: 10 },
  regCellCat: { fontFamily: 'Syne', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 12, paddingLeft: 10, paddingRight: 4 },
  regCellTime: { fontFamily: 'DMSans', fontSize: 11, fontWeight: 500, color: C.text, paddingVertical: 12, paddingHorizontal: 10, textAlign: 'right' },
  regCellDesc: { fontFamily: 'Syne', fontSize: 9, fontWeight: 600, color: C.secondary, paddingVertical: 12, paddingHorizontal: 10 },
})

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
      {subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
    </View>
  )
}

// ── KPI Table ─────────────────────────────────────────────────────────────────
function KpiTable({ data }: { data: PdfData }) {
  const rows = [
    { label: 'TEMPO PROJETADO', value: safeTime(data.tempoProjetado), color: C.text },
    { label: 'TEMPO LOGIN',     value: safeTime(data.tempoLogin),     color: C.text },
    { label: 'ABS',             value: data.absPct,                   color: absColor(data.absPctNum) },
    { label: 'INDISP',          value: data.indispPct,                color: indispColor(data.indispPctNum) },
  ]
  return (
    <View style={s.tableWrap}>
      <View style={s.tHead}>
        <Text style={[s.tHeadCell, { flex: 1 }]}>MÉTRICA</Text>
        <Text style={[s.tHeadCell, { width: 90, textAlign: 'right' }]}>RESULTADO</Text>
      </View>
      {rows.map((row, i) => (
        <View key={row.label} style={i === rows.length - 1 ? s.tRowLast : s.tRow}>
          <Text style={s.tCellLabel}>{row.label}</Text>
          <Text style={[s.tCellValue, { color: row.color, width: 90 }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Contestação Table ─────────────────────────────────────────────────────────
function ContestacaoTable({ data }: { data: PdfData }) {
  type MetricRow = { label: string; value: string; delta: string; valueColor: string }
  type InputRow  = { label: string; value: string; desc: string }

  const metricRows: MetricRow[] = []
  const inputRows:  InputRow[]  = []

  if (data.absPctContestadoNum !== null && data.deficitMin > 0) {
    const dentro = data.absPctContestadoNum <= 5
    // MUDANÇA 2: delta always C.text, semantic color only on the contestado value
    metricRows.push({ label: 'ABS', value: data.absPctContestado, delta: data.absDelta, valueColor: dentro ? C.green : C.red })
  }
  if (data.indispPctContestadaNum !== null && data.pausasMin > 0) {
    const dentro = data.indispPctContestadaNum <= 14.5
    metricRows.push({ label: 'INDISP', value: data.indispPctContestada, delta: data.indispDelta, valueColor: dentro ? C.green : C.red })
  }
  if (data.pausasMin > 0)  inputRows.push({ label: 'PAUSA JUSTIFICADA', value: safeTime(data.pausasFormatado),  desc: 'aplicada à Indisp' })
  if (data.deficitMin > 0) inputRows.push({ label: 'FORA DA JORNADA',   value: safeTime(data.deficitFormatado), desc: 'aplicado ao ABS' })

  if (metricRows.length === 0 && inputRows.length === 0) return (
    <View style={[s.tableWrap, { padding: 10 }]}>
      <Text style={{ fontFamily: 'Syne', fontSize: 8, fontWeight: 600, color: C.muted }}>Sem dados de contestação.</Text>
    </View>
  )

  const W = { val: 90, delta: 82 }

  return (
    <View style={{ gap: 8 }}>
      {metricRows.length > 0 && (
        <View style={s.tableWrap}>
          <View style={s.tHead}>
            <Text style={[s.tHeadCell, { flex: 1 }]}>MÉTRICA</Text>
            <Text style={[s.tHeadCell, { width: W.val,   textAlign: 'right' }]}>CONTESTADO</Text>
            <Text style={[s.tHeadCell, { width: W.delta, textAlign: 'right' }]}>DIFERENÇA</Text>
          </View>
          {metricRows.map((row, i) => (
            <View key={row.label} style={i === metricRows.length - 1 ? s.tRowLast : s.tRow}>
              <Text style={s.tCellLabel}>{row.label}</Text>
              <Text style={[s.tCellValue, { color: row.valueColor, width: W.val   }]}>{row.value}</Text>
              {/* MUDANÇA 2: DIFERENÇA always in C.text (no semantic color) */}
              <Text style={[s.tCellValue, { color: C.text, width: W.delta }]}>{row.delta}</Text>
            </View>
          ))}
        </View>
      )}

      {inputRows.length > 0 && (
        <View style={s.tableWrap}>
          <View style={s.tHead}>
            <Text style={[s.tHeadCell, { flex: 1 }]}>AJUSTE APLICADO</Text>
            <Text style={[s.tHeadCell, { width: 100, textAlign: 'right' }]}>TEMPO</Text>
          </View>
          {inputRows.map((row, i) => (
            <View key={row.label} style={i === inputRows.length - 1 ? s.tRowLast : s.tRow}>
              <View style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 10 }}>
                <Text style={{ fontFamily: 'Syne', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: C.secondary }}>{row.label}</Text>
                <Text style={{ fontFamily: 'Syne', fontSize: 8, fontWeight: 600, color: C.muted, marginTop: 2 }}>{row.desc}</Text>
              </View>
              <Text style={[s.tCellInputVal, { width: 100 }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ── MetricBar (horizontal bar chart) ─────────────────────────────────────────
const BAR_TOTAL_W = 515

function MetricBar({ label, orig, cont, limit }: {
  label: string; orig: number; cont: number | null; limit: number
}) {
  const H        = 82
  const labelW   = 70
  const valueW   = 56
  const barAreaW = BAR_TOTAL_W - labelW - valueW
  const barX     = labelW
  const barH     = 14

  const maxVal   = Math.max(orig, cont ?? 0, limit) * 1.35
  const scale    = (v: number) => barX + (v / maxVal) * barAreaW
  const limitX   = scale(limit)
  const origX    = scale(orig)
  const contX    = cont !== null ? scale(cont) : barX
  const origOver = orig > limit

  const y1    = 30
  const y2    = 54
  const axisY = 70

  return (
    <Svg width={BAR_TOTAL_W} height={H}>
      <SvgText x={0} y={14} fontSize={12} fontFamily="Syne" fontWeight="bold" fill={C.text} textAnchor="start">{label}</SvgText>

      <Rect x={barX} y={y1 - barH / 2} width={barAreaW} height={barH} rx={3} ry={3} fill="#eeeeee" />
      <Rect x={barX} y={y2 - barH / 2} width={barAreaW} height={barH} rx={3} ry={3} fill="#eeeeee" />

      <Rect x={barX} y={y1 - barH / 2} width={Math.max(0, origX - barX)} height={barH} rx={3} ry={3} fill={C.gold} />
      {origOver && (
        <Rect x={limitX} y={y1 - barH / 2} width={Math.max(0, origX - limitX)} height={barH} rx={0} ry={0} fill={C.red} />
      )}

      {cont !== null && (
        <Rect x={barX} y={y2 - barH / 2} width={Math.max(0, contX - barX)} height={barH} rx={3} ry={3} fill={C.green} />
      )}

      <Line x1={limitX} y1={y1 - barH / 2} x2={limitX} y2={axisY} stroke={C.red} strokeWidth={0.75} strokeDasharray="2,2" />

      <SvgText x={0} y={y1 + 4} fontSize={9} fontFamily="Syne" fill={C.secondary} textAnchor="start">ORIGINAL</SvgText>
      <SvgText x={0} y={y2 + 4} fontSize={9} fontFamily="Syne" fill={C.secondary} textAnchor="start">CONTESTADO</SvgText>

      <SvgText x={BAR_TOTAL_W - valueW + 6} y={y1 + 4} fontSize={11} fontFamily="DMSans" fontWeight="bold" fill={origOver ? C.red : C.gold} textAnchor="start">
        {`${fmt2(orig)}%`}
      </SvgText>
      {cont !== null && (
        <SvgText x={BAR_TOTAL_W - valueW + 6} y={y2 + 4} fontSize={11} fontFamily="DMSans" fontWeight="bold" fill={C.green} textAnchor="start">
          {`${fmt2(cont)}%`}
        </SvgText>
      )}

      {/* MUDANÇA 3 — X-axis: 0% and maxVal% in DMSans; LIMITE split Syne+DMSans anchored at limitX */}
      <Line x1={barX} y1={axisY} x2={barX + barAreaW} y2={axisY} stroke="#dddddd" strokeWidth={0.5} />
      <SvgText x={barX}            y={axisY + 9} fontSize={7} fontFamily="DMSans" fill={C.secondary} textAnchor="middle">
        {'0%'}
      </SvgText>
      {/* "LIMITE " right-edge at limitX (Syne) + "5,00%" left-edge at limitX (DMSans) */}
      <SvgText x={limitX} y={axisY + 9} fontSize={7} fontFamily="Syne"   fill={C.red} textAnchor="end">
        {'LIMITE '}
      </SvgText>
      <SvgText x={limitX} y={axisY + 9} fontSize={7} fontFamily="DMSans" fill={C.red} textAnchor="start">
        {`${fmt2(limit)}%`}
      </SvgText>
      <SvgText x={barX + barAreaW} y={axisY + 9} fontSize={7} fontFamily="DMSans" fill={C.secondary} textAnchor="end">
        {`${Math.ceil(maxVal)}%`}
      </SvgText>
    </Svg>
  )
}

// ── Registros row ─────────────────────────────────────────────────────────────
function RegRow({ r, isLast, i }: { r: PdfRegistro; isLast: boolean; i: number }) {
  const catColor = tipoColor(r.tipo)
  const obs      = [r.observacoes, r.glpi ? `GLPI: ${r.glpi}` : ''].filter(Boolean).join(' · ')
  const zebra    = i % 2 === 1 ? { backgroundColor: '#fefdf8' } : {}
  return (
    <View style={[isLast ? s.regRowLast : s.regRow, zebra]} wrap={false}>
      <Text style={[s.regCellDate, { width: 80  }]}>{r.data}</Text>
      <Text style={[s.regCellCat,  { width: 118, color: catColor }]}>{r.tipo}</Text>
      <Text style={[s.regCellTime, { width: 68  }]}>{safeTime(r.tempoDisplay)}</Text>
      {/* MUDANÇA 5: mixed-font description — numbers in DMSans, prose in Syne */}
      <Text style={[s.regCellDesc, { flex: 1 }]}>
        {obs ? renderDesc(obs) : '—'}
      </Text>
    </View>
  )
}

// Column header — kept with section title (anti-orphan anchor)
function RegColHeader() {
  return (
    <View style={s.regHeadWrap}>
      <Text style={[s.regHeadCell, { width: 80 }]}>DATA</Text>
      <Text style={[s.regHeadCell, { width: 118 }]}>CATEGORIA</Text>
      <Text style={[s.regHeadCell, { width: 68, textAlign: 'right' }]}>TEMPO</Text>
      <Text style={[s.regHeadCell, { flex: 1 }]}>DESCRIÇÃO</Text>
    </View>
  )
}

// ── Main Document ─────────────────────────────────────────────────────────────
export function ContestacaoRVDocument({ data }: { data: PdfData }) {
  const hasAbs    = data.absPctNum !== null && data.deficitMin > 0
  const hasIndisp = data.indispPctNum !== null && data.pausasMin > 0
  const hasChart  = hasAbs || hasIndisp
  const mes       = mesExt(data.mesLabel)
  const mesYear   = data.mesLabel.match(/\d{4}$/)?.[0] ?? ''
  const mesMonth  = data.mesLabel.replace(/\s*\d{4}$/, '').trim()

  return (
    <Document
      title={`Contestação RV — ${data.operadorNome} — ${mes}`}
      author="HALO"
      subject="Contestação de RV"
    >
      <Page size="A4" style={s.page}>

        {/* FOOTER — fixed, all pages */}
        <View style={s.footer} fixed>
          <View style={s.footerLine} />
          <View style={s.footerRow}>
            <Text style={s.footerTextLeft}>HALO — Contestação de RV</Text>
            <Text
              style={s.footerTextRight}
              render={({ pageNumber, totalPages }) =>
                `Gerado em ${data.geradoEm} às ${data.geradoHora}  ·  Pág. ${pageNumber} de ${totalPages}`
              }
            />
          </View>
        </View>

        {/* RUNNING HEADER — page 2+
            MUDANÇA 4: "2026" rendered in DMSans Medium, rest in Syne */}
        <View
          fixed
          render={({ pageNumber }) => pageNumber <= 1 ? null : (
            <View>
              <View style={s.runHeader}>
                <Text style={s.runHeaderLeft}>
                  {`${data.operadorNome.toUpperCase()} · CONTESTAÇÃO DE RV · ${mesMonth} `}
                  <Text style={{ fontFamily: 'DMSans', fontWeight: 500 }}>{mesYear}</Text>
                </Text>
              </View>
              <View style={s.runHeaderLine} />
            </View>
          )}
        />

        {/* MAIN HEADER */}
        <View style={s.docHeaderRow}>
          <View>
            <Text style={s.haloText}>HALO</Text>
            <Text style={s.docSubtitle}>RELATÓRIO DE CONTESTAÇÃO DE RV</Text>
          </View>
          {/* MUDANÇA 1: date matches subtitle — 11px, C.secondary, letterSpacing 2.2
              Mixed: mesMonth in Syne SemiBold, mesYear in DMSans Black 'tnum' */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 11, letterSpacing: 2.2, color: C.secondary }}>
              <Text style={{ fontFamily: 'Syne', fontWeight: 600 }}>{mesMonth} </Text>
              <Text style={{ fontFamily: 'DMSans', fontWeight: 900 }}>{mesYear}</Text>
            </Text>
          </View>
        </View>
        <View style={s.docGoldLine} />

        {/* OPERATOR BLOCK */}
        <View style={{ marginBottom: 24 }}>
          <Text style={s.opName}>{data.operadorNome}</Text>
          <Text style={s.opEmail}>{data.operadorEmail || '—'}</Text>
          <View style={s.cargoRow}>
            <View style={s.cargoBlock}>
              <Text style={s.cargoLabel}>CARGO</Text>
              <Text style={s.cargoValue}>{data.operadorCargo}</Text>
            </View>
            <View style={s.cargoBlock}>
              <Text style={s.cargoLabel}>SUPERVISOR</Text>
              <Text style={s.cargoValue}>{data.operadorSupervisor}</Text>
            </View>
          </View>
        </View>

        <View style={s.subtleDivider} />

        {/* KPI (45%) + CONTESTAÇÃO (55%) */}
        <View style={s.twoCol}>
          <View style={s.colKpi}>
            <SectionHeader title="KPI ORIGINAL" subtitle="Apurado consolidado do mês, sem contestações." />
            <KpiTable data={data} />
            {!data.encontrado && (
              <Text style={{ fontFamily: 'Syne', fontSize: 7, fontWeight: 600, color: C.muted, marginTop: 4 }}>
                * Não encontrado na planilha KPI CONSOLIDADO
              </Text>
            )}
          </View>
          <View style={s.colContest}>
            <SectionHeader title="CONTESTAÇÃO APLICADA" subtitle="Resultado hipotético após registros do Diário." />
            <ContestacaoTable data={data} />
          </View>
        </View>

        {/* EVOLUÇÃO — ABS anchored with section title, INDISP flows independently */}
        {hasChart && (
          <View style={s.sectionGap}>
            <View wrap={false}>
              <SectionHeader
                title="EVOLUÇÃO EM RELAÇÃO AO LIMITE"
                subtitle="Comparação entre resultado original e contestado, com limite regulatório."
              />
              {hasAbs && (
                <MetricBar
                  label="ABS"
                  orig={data.absPctNum!}
                  cont={data.absPctContestadoNum}
                  limit={5}
                />
              )}
            </View>
            {hasIndisp && (
              <View style={hasAbs ? { marginTop: 20 } : {}}>
                <MetricBar
                  label="INDISP"
                  orig={data.indispPctNum!}
                  cont={data.indispPctContestadaNum}
                  limit={14.5}
                />
              </View>
            )}
          </View>
        )}

        {/* REGISTROS DO DIÁRIO — natural flow, no forced break */}
        {data.registros.length > 0 && (
          <View style={s.sectionGap}>
            <View wrap={false}>
              <SectionHeader
                title="REGISTROS DO DIÁRIO"
                subtitle="Ocorrências registradas pela gestora que fundamentam a contestação."
              />
              <RegColHeader />
            </View>
            <View style={s.regBodyWrap}>
              {data.registros.map((r, i) => (
                <RegRow
                  key={i}
                  r={r}
                  i={i}
                  isLast={i === data.registros.length - 1}
                />
              ))}
            </View>
          </View>
        )}

      </Page>
    </Document>
  )
}
