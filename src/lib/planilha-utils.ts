const MESES_NORM = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const MESES_EXIB = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']

function normStr(s: string): string {
  return s.toLowerCase()
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ç/g, 'c')
}

export function extrairMesAnoDoNome(nome: string): { mes: number; ano: number } | null {
  const norm = normStr(nome)
  const anoMatch = norm.match(/\b(20\d{2})\b/)
  if (!anoMatch) return null
  const ano = parseInt(anoMatch[1], 10)
  for (let i = 0; i < MESES_NORM.length; i++) {
    if (norm.includes(MESES_NORM[i])) return { mes: i + 1, ano }
  }
  return null
}

export function mesLabelDaPlanilha(planilha: { nome: string } | null | undefined): string {
  if (!planilha) return ''
  const mesAno = extrairMesAnoDoNome(planilha.nome)
  if (!mesAno) return ''
  return `${MESES_EXIB[mesAno.mes - 1]} DE ${mesAno.ano}`
}
