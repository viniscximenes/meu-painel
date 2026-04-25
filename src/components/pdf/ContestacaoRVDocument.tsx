import React from 'react'
import {
  Document, Page, View, Text, StyleSheet,
  Svg, Rect, Line, Circle, Path, G,
  Text as _SvgTextBase,
  Font,
} from '@react-pdf/renderer'
import type { PdfData, PdfRegistro } from '@/lib/pdf-data-builder'

// Disables automatic hyphenation — prevents "Após Contes-/tação", "1-h 19min" etc.
Font.registerHyphenationCallback((word) => [word])

// SVGTextProps doesn't expose fontSize/fontWeight — local alias
const SvgText = _SvgTextBase as unknown as React.ComponentType<{
  x: number | string
  y: number | string
  fill?: string
  fontSize?: number | string
  fontWeight?: number | string
  fontFamily?: string
  textAnchor?: 'start' | 'middle' | 'end'
  children?: React.ReactNode
}>

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  white:    '#ffffff',
  border:   '#e5e7eb',
  divider:  '#e5e5e5',
  primary:  '#0f172a',
  label:    '#374151',
  muted:    '#9ca3af',
  secondary:'#6b7280',
  gold:     '#b8893b',
  goldBg:   '#fdf6e3',
  goldLine: '#c9a84c',
  green:    '#16a34a',
  red:      '#dc2626',
  blue:     '#1e40af',
  mustard:  '#a16207',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9,
    color: C.primary,
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
  },
  footerLine: { height: 0.5, backgroundColor: C.divider, marginBottom: 6 },
  footerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 7.5, color: C.muted },

  runningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  runningGoldLine: { height: 0.5, backgroundColor: C.gold, opacity: 0.35, marginBottom: 20 },
  runningName:  { fontSize: 8, color: C.primary },
  runningTitle: { fontSize: 7.5, color: C.gold, letterSpacing: 0.6 },

  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  logoCol:      { alignItems: 'center', gap: 5 },
  haloLabel:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#8b6f2a', letterSpacing: 4 },
  headerTitleCol: { alignItems: 'flex-end', gap: 2 },
  headerDocLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gold, letterSpacing: 1.4 },
  headerMes:    { fontSize: 10, color: C.secondary, marginTop: 2, letterSpacing: 0.3 },

  goldDivider:   { height: 1,   backgroundColor: C.goldLine, marginVertical: 12 },
  subtleDivider: { height: 0.5, backgroundColor: C.goldLine, opacity: 0.25, marginVertical: 10 },

  operatorName:  { fontSize: 24, fontFamily: 'Helvetica-Bold', color: C.primary, marginBottom: 4, letterSpacing: -0.3 },
  operatorEmail: { fontSize: 10, color: C.secondary, marginBottom: 10 },
  cargoRow:      { flexDirection: 'row', gap: 40 },
  cargoBlock:    { gap: 3 },
  cargoLabel:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.muted, letterSpacing: 1, textTransform: 'uppercase' },
  cargoValue:    { fontSize: 11, color: C.primary },

  sectionGap:       { marginTop: 20 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  sectionBar:       { width: 3, height: 11, backgroundColor: C.gold },
  sectionTitle:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gold, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionSubtitle:  { fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: C.secondary, marginBottom: 12 },

  twoCol:     { flexDirection: 'row', gap: 20 },
  colKpi:     { flex: 9 },
  colContest: { flex: 11 },

  tableWrap: { borderWidth: 0.5, borderColor: C.border, borderRadius: 4 },
  tHead:     { flexDirection: 'row', backgroundColor: C.goldBg, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tHeadCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#8b6f2a', letterSpacing: 0.7, paddingVertical: 6, paddingHorizontal: 10 },
  tRow:      { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.divider },
  tRowSep:   { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: C.gold },
  tRowLast:  { flexDirection: 'row' },
  tCellLabel:{ fontSize: 9.5, color: C.label, paddingVertical: 8, paddingHorizontal: 10, flex: 1 },
  tCellValue:{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.primary, paddingVertical: 8, paddingHorizontal: 10, textAlign: 'right' },

  regWrap:     { borderWidth: 0.5, borderColor: C.border, borderRadius: 4 },
  regHead:     { flexDirection: 'row', backgroundColor: C.goldBg, borderBottomWidth: 0.5, borderBottomColor: C.border },
  regRow:      { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.divider, alignItems: 'center' },
  regRowLast:  { flexDirection: 'row', alignItems: 'center' },
  regHeadCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#8b6f2a', letterSpacing: 0.7, paddingVertical: 6, paddingHorizontal: 10 },
  regCellMuted:{ fontSize: 8.5, color: C.secondary, paddingVertical: 8, paddingHorizontal: 10 },
  regCellBlack:{ fontSize: 8.5, color: C.primary, fontFamily: 'Helvetica-Bold', paddingVertical: 8, paddingHorizontal: 4 },
  regCellTime: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.primary, paddingVertical: 8, paddingHorizontal: 10, textAlign: 'right' },
  regCellDesc: { fontSize: 8.5, color: C.label, paddingVertical: 8, paddingHorizontal: 10 },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt2(n: number): string { return n.toFixed(2).replace('.', ',') }
function absColor(v: number | null)   { return v !== null && v > 5    ? C.red : C.primary }
function indispColor(v: number | null){ return v !== null && v > 14.5 ? C.red : C.primary }

/** "ABRIL DE 2026" → "Abril de 2026" */
function mesExt(mesLabel: string): string {
  return mesLabel
    .split(' ')
    .map((w, i) => i === 0 ? w.charAt(0) + w.slice(1).toLowerCase() : w.toLowerCase())
    .join(' ')
}

// ── Gauge badge ───────────────────────────────────────────────────────────────
function GaugeBadge() {
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Rect x={0} y={0} width={40} height={40} rx={6} ry={6} fill="#e8c874" />
      <G transform="translate(8, 6)">
        <Path d="M3.34 19a10 10 0 1 1 17.32 0" stroke="#0a0a0a" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M12 14 L16 10" stroke="#0a0a0a" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Circle cx={12} cy={14} r={1.5} fill="#0a0a0a" />
      </G>
    </Svg>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <View style={s.sectionHeaderRow}>
        <View style={s.sectionBar} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {subtitle
        ? <Text style={s.sectionSubtitle}>{subtitle}</Text>
        : <View style={{ marginBottom: 12 }} />}
    </View>
  )
}

// ── KPI Table ─────────────────────────────────────────────────────────────────
function KpiTable({ data }: { data: PdfData }) {
  const rows = [
    { label: 'Tempo Projetado', value: data.tempoProjetado, color: C.primary },
    { label: 'Tempo Login',     value: data.tempoLogin,     color: C.primary },
    { label: 'ABS',             value: data.absPct,         color: absColor(data.absPctNum) },
    { label: 'Indisp',          value: data.indispPct,      color: indispColor(data.indispPctNum) },
  ]
  return (
    <View style={s.tableWrap}>
      <View style={s.tHead}>
        <Text style={[s.tHeadCell, { flex: 1 }]}>Métrica</Text>
        <Text style={[s.tHeadCell, { width: 80, textAlign: 'right' }]}>Resultado</Text>
      </View>
      {rows.map((row, i) => (
        <View key={row.label} style={i === rows.length - 1 ? s.tRowLast : s.tRow}>
          <Text style={s.tCellLabel}>{row.label}</Text>
          <Text style={[s.tCellValue, { color: row.color, width: 80 }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Contestação Table ─────────────────────────────────────────────────────────
function ContestacaoTable({ data }: { data: PdfData }) {
  type Row = { label: string; value: string; delta: string | null; valueColor: string; deltaColor: string; contextText?: string }

  const metricRows: Row[] = []
  const inputRows:  Row[] = []

  if (data.absPctContestadoNum !== null) {
    const delta  = data.absDelta
    const isDown = delta.startsWith('–') || delta.startsWith('-')
    metricRows.push({ label: 'ABS', value: data.absPctContestado, delta, valueColor: C.green, deltaColor: isDown ? C.green : C.red })
  }
  if (data.indispPctContestadaNum !== null) {
    const delta  = data.indispDelta
    const isDown = delta.startsWith('–') || delta.startsWith('-')
    metricRows.push({ label: 'Indisp', value: data.indispPctContestada, delta, valueColor: C.green, deltaColor: isDown ? C.green : C.red })
  }
  if (data.pausasMin > 0) {
    inputRows.push({ label: 'Pausa Justificada', value: data.pausasFormatado, delta: null, valueColor: C.blue,    deltaColor: C.muted, contextText: 'aplicada à Indisp' })
  }
  if (data.deficitMin > 0) {
    inputRows.push({ label: 'Déficit Aplicado',  value: data.deficitFormatado, delta: null, valueColor: C.mustard, deltaColor: C.muted, contextText: 'aplicado ao ABS' })
  }

  const hasBoth = metricRows.length > 0 && inputRows.length > 0
  const allRows = [...metricRows, ...inputRows]

  if (allRows.length === 0) return (
    <View style={[s.tableWrap, { padding: 10 }]}>
      <Text style={{ fontSize: 8, color: C.muted }}>Sem dados de contestação.</Text>
    </View>
  )

  return (
    <View style={s.tableWrap}>
      <View style={s.tHead}>
        <Text style={[s.tHeadCell, { flex: 1 }]}>Métrica</Text>
        <Text style={[s.tHeadCell, { width: 66, textAlign: 'right' }]}>Contestado</Text>
        <Text style={[s.tHeadCell, { width: 82, textAlign: 'right' }]}>Diferença</Text>
      </View>
      {allRows.map((row, i) => {
        const isLast     = i === allRows.length - 1
        const isSepAfter = hasBoth && i === metricRows.length - 1 && !isLast
        const rowStyle   = isLast ? s.tRowLast : isSepAfter ? s.tRowSep : s.tRow
        return (
          <View key={row.label} style={rowStyle}>
            <Text style={s.tCellLabel}>{row.label}</Text>
            <Text style={[s.tCellValue, { color: row.valueColor, width: 66 }]}>{row.value}</Text>
            <View style={{ width: 82, paddingVertical: 7, paddingHorizontal: 10, alignItems: 'flex-end', justifyContent: 'center' }}>
              {row.delta ? (
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: row.deltaColor }}>{row.delta}</Text>
              ) : row.contextText ? (
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Oblique', color: C.muted, textAlign: 'right' }}>{row.contextText}</Text>
              ) : (
                <Text style={{ fontSize: 11, color: C.muted }}>—</Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ── Horizontal impact bar chart ───────────────────────────────────────────────
const BAR_TOTAL_W = 515

function MetricBar({ label, orig, cont, limit, origColor }: {
  label: string
  orig: number
  cont: number | null
  limit: number
  origColor: string
}) {
  const H        = 72
  const labelW   = 66
  const valueW   = 52
  const barAreaW = BAR_TOTAL_W - labelW - valueW
  const barX     = labelW
  const barH     = 11

  const maxVal   = Math.max(orig, cont ?? 0, limit) * 1.35
  const scale    = (v: number) => barX + (v / maxVal) * barAreaW
  const limitX   = scale(limit)
  const origX    = scale(orig)
  const contX    = cont !== null ? scale(cont) : barX
  const origOver = orig > limit

  const y1    = 24   // center of Original bar
  const y2    = 46   // center of Contestado bar
  const axisY = 60

  return (
    <Svg width={BAR_TOTAL_W} height={H}>
      {/* Metric label */}
      <SvgText x={0} y={10} fontSize={8.5} fontWeight="bold" fill={origColor} textAnchor="start">{label}</SvgText>

      {/* Gray track bars */}
      <Rect x={barX} y={y1 - barH / 2} width={barAreaW} height={barH} rx={3} ry={3} fill="#eeeeee" />
      <Rect x={barX} y={y2 - barH / 2} width={barAreaW} height={barH} rx={3} ry={3} fill="#eeeeee" />

      {/* Original bar (gold/blue), then red overlay if exceeds limit */}
      <Rect x={barX} y={y1 - barH / 2} width={Math.max(0, origX - barX)} height={barH} rx={3} ry={3} fill={origColor} />
      {origOver && (
        <Rect x={limitX} y={y1 - barH / 2} width={Math.max(0, origX - limitX)} height={barH} rx={0} ry={0} fill={C.red} />
      )}

      {/* Contestado bar */}
      {cont !== null && (
        <Rect x={barX} y={y2 - barH / 2} width={Math.max(0, contX - barX)} height={barH} rx={3} ry={3} fill={C.green} />
      )}

      {/* Limit dashed line */}
      <Line x1={limitX} y1={y1 - barH / 2} x2={limitX} y2={axisY} stroke={C.red} strokeWidth={0.75} strokeDasharray="2,2" />

      {/* Row labels */}
      <SvgText x={0} y={y1 + 4} fontSize={7.5} fill={C.secondary} textAnchor="start">Original</SvgText>
      <SvgText x={0} y={y2 + 4} fontSize={7.5} fill={C.secondary} textAnchor="start">Contestado</SvgText>

      {/* Values */}
      <SvgText x={BAR_TOTAL_W - valueW + 4} y={y1 + 4} fontSize={8} fontWeight="bold" fill={origOver ? C.red : origColor} textAnchor="start">
        {`${fmt2(orig)}%`}
      </SvgText>
      {cont !== null && (
        <SvgText x={BAR_TOTAL_W - valueW + 4} y={y2 + 4} fontSize={8} fontWeight="bold" fill={C.green} textAnchor="start">
          {`${fmt2(cont)}%`}
        </SvgText>
      )}

      {/* X-axis */}
      <Line x1={barX} y1={axisY} x2={barX + barAreaW} y2={axisY} stroke="#dddddd" strokeWidth={0.5} />
      <SvgText x={barX}              y={axisY + 9} fontSize={6.5} fill={C.muted} textAnchor="middle">0%</SvgText>
      <SvgText x={limitX}            y={axisY + 9} fontSize={6.5} fill={C.red}   textAnchor="middle">{`Limite ${fmt2(limit)}%`}</SvgText>
      <SvgText x={barX + barAreaW}   y={axisY + 9} fontSize={6.5} fill={C.muted} textAnchor="end">{`${Math.ceil(maxVal)}%`}</SvgText>
    </Svg>
  )
}

function ImpactChart({ data }: { data: PdfData }) {
  if (data.absPctNum === null && data.indispPctNum === null) return null
  return (
    <View style={{ gap: 14 }}>
      {data.absPctNum !== null && (
        <MetricBar label="ABS"   orig={data.absPctNum}    cont={data.absPctContestadoNum}    limit={5}    origColor={C.gold} />
      )}
      {data.indispPctNum !== null && (
        <MetricBar label="INDISP" orig={data.indispPctNum} cont={data.indispPctContestadaNum} limit={14.5} origColor={C.blue} />
      )}
    </View>
  )
}

// ── Registros Table ───────────────────────────────────────────────────────────
function RegistrosTable({ registros }: { registros: PdfRegistro[] }) {
  if (registros.length === 0) return null
  return (
    <View style={s.regWrap}>
      <View style={s.regHead}>
        <Text style={[s.regHeadCell, { width: 62 }]}>Data</Text>
        <Text style={[s.regHeadCell, { width: 113 }]}>Categoria</Text>
        <Text style={[s.regHeadCell, { width: 52, textAlign: 'right' }]}>Tempo</Text>
        <Text style={[s.regHeadCell, { flex: 1 }]}>Descrição</Text>
      </View>
      {registros.map((r, i) => {
        const isLast   = i === registros.length - 1
        const dotColor = r.tipo === 'Pausa justificada' ? C.blue : C.mustard
        const obs      = [r.observacoes, r.glpi ? `GLPI: ${r.glpi}` : ''].filter(Boolean).join(' · ')
        return (
          <View key={i} style={isLast ? s.regRowLast : s.regRow} wrap={false}>
            <Text style={[s.regCellMuted, { width: 62 }]}>{r.data}</Text>
            <View style={{ width: 113, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 10 }}>
              <Svg width={8} height={8} viewBox="0 0 8 8">
                <Circle cx={4} cy={4} r={3.5} fill={dotColor} />
              </Svg>
              <Text style={s.regCellBlack}>{r.tipo}</Text>
            </View>
            <Text style={[s.regCellTime, { width: 52 }]}>{r.tempoDisplay}</Text>
            <Text style={[s.regCellDesc, { flex: 1 }]}>{obs || '—'}</Text>
          </View>
        )
      })}
    </View>
  )
}

// ── Main document ─────────────────────────────────────────────────────────────
export function ContestacaoRVDocument({ data }: { data: PdfData }) {
  const hasChart = data.absPctNum !== null || data.indispPctNum !== null
  const mes      = mesExt(data.mesLabel)

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
            <Text style={s.footerText}>HALO — Relatório de Contestação de RV</Text>
            <Text
              style={s.footerText}
              render={({ pageNumber, totalPages }) =>
                `Gerado em ${data.geradoEm} às ${data.geradoHora}  ·  Pág. ${pageNumber} de ${totalPages}`
              }
            />
          </View>
        </View>

        {/* RUNNING HEADER — page 2+ only */}
        <View
          fixed
          render={({ pageNumber }) => pageNumber <= 1 ? null : (
            <View>
              <View style={s.runningHeader}>
                <Text style={s.runningName}>{data.operadorNome}</Text>
                <Text style={s.runningTitle}>{`CONTESTAÇÃO DE RV  ·  ${mes}`}</Text>
              </View>
              <View style={s.runningGoldLine} />
            </View>
          )}
        />

        {/* MAIN HEADER */}
        <View style={s.headerTopRow}>
          <View style={s.logoCol}>
            <GaugeBadge />
            <Text style={s.haloLabel}>HALO</Text>
          </View>
          <View style={s.headerTitleCol}>
            <Text style={s.headerDocLabel}>RELATÓRIO DE</Text>
            <Text style={s.headerDocLabel}>CONTESTAÇÃO DE RV</Text>
            <Text style={s.headerMes}>{mes}</Text>
          </View>
        </View>

        <View style={s.goldDivider} />

        {/* Operator identity */}
        <Text style={s.operatorName}>{data.operadorNome}</Text>
        <Text style={s.operatorEmail}>{data.operadorEmail || '—'}</Text>
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

        <View style={s.subtleDivider} />

        {/* KPI (45%) + Contestação (55%) */}
        <View style={s.twoCol}>
          <View style={s.colKpi}>
            <SectionHeader
              title="KPI Original"
              subtitle="Apurado consolidado do mês, sem contestações."
            />
            <KpiTable data={data} />
            {!data.encontrado && (
              <Text style={{ fontSize: 7, color: C.muted, marginTop: 4 }}>
                * Não encontrado na planilha KPI CONSOLIDADO
              </Text>
            )}
          </View>
          <View style={s.colContest}>
            <SectionHeader
              title="Contestação Aplicada"
              subtitle="Resultado hipotético após registros do Diário."
            />
            <ContestacaoTable data={data} />
          </View>
        </View>

        {/* HORIZONTAL BAR CHART */}
        {hasChart && (
          <View style={s.sectionGap}>
            <SectionHeader
              title="Evolução em Relação ao Limite"
              subtitle="Comparação entre resultado original e contestado, com limite regulatório."
            />
            <ImpactChart data={data} />
          </View>
        )}

        {/* REGISTROS */}
        {data.registros.length > 0 && (
          <View style={s.sectionGap}>
            <SectionHeader
              title={`Registros do Diário — ${mes}`}
              subtitle="Ocorrências registradas pela gestora que fundamentam a contestação."
            />
            <RegistrosTable registros={data.registros} />
          </View>
        )}

      </Page>
    </Document>
  )
}
