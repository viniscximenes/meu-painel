import { Clock } from 'lucide-react'

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

interface Props {
  mesFechamento?: { mes: number; ano: number }
  texto?: string
}

export function BannerAguardandoKPI({ mesFechamento, texto }: Props) {
  let descricao: string
  if (texto) {
    descricao = texto
  } else if (mesFechamento) {
    const nomeMes = MESES_PT[mesFechamento.mes - 1] ?? `Mês ${mesFechamento.mes}`
    descricao = `O KPI do mês atual ainda não foi liberado. Abaixo o demonstrativo do fechamento de ${nomeMes}/${mesFechamento.ano}.`
  } else {
    descricao = 'Aguardando KPI do mês atual.'
  }

  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.20)',
      borderRadius: '20px',
      padding: '24px 28px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Clock size={24} style={{ color: '#e8c96d', flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '18px',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
          color: '#e8c96d',
        }}>
          AGUARDANDO KPI DO MÊS
        </span>
      </div>
      <p style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 600,
        fontSize: '13px',
        color: '#A6A2A2',
        lineHeight: 1.6,
        margin: 0,
        paddingLeft: '34px',
      }}>
        {descricao}
      </p>
    </div>
  )
}
