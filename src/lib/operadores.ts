import { Operador } from '@/types'

// Lista completa dos operadores — IDs vinculados ao campo operador_id no perfil Supabase
export const OPERADORES: (Omit<Operador, 'profile_id'> & { ocultar?: true })[] = [
  { id: 1,  nome: 'Samyrha Fenix da Silva Costa',       username: 'samyrha.fenix' },
  { id: 2,  nome: 'Marcos Paulo Rodrigues da Silva',    username: 'marcos.psilva' },
  { id: 3,  nome: 'Bruno Chaves Roberto',               username: 'bruno.roberto' },
  { id: 4,  nome: 'Reyzo Miranda Candido de Deus',      username: 'reyzo.deus' },
  { id: 5,  nome: 'Kaian Alfradique Rodrigues',         username: 'kaian.alfradique' },
  { id: 6,  nome: 'Edna de Souza',                      username: 'edna.desouza' },
  { id: 7,  nome: 'Sara Secundo Batista da Silva',      username: 'sara.secundo' },
  { id: 8,  nome: 'Igor Rogerio da Silva Souza',        username: 'igor.souza' },
  { id: 9,  nome: 'Willian Gozzi Nunes de Souza',       username: 'willian.souza' },
  { id: 10, nome: 'Thyelen Oliveira Azevedo',           username: 'thyelen.azevedo' },
  { id: 11, nome: 'Barbara Beatriz Damasceno Vilela',   username: 'barbara.vilela' },
  { id: 12, nome: 'Vítor Hugo de Almeida Rodrigues',    username: 'vitor.halmeida' },
  { id: 13, nome: 'Caio Vinicius Ximenes da Silva',     username: 'caio.vsilva' },
  { id: 14, nome: 'Ana Angelica Mattos Goncalves',      username: 'ana.angelica', ocultar: true },
]

// Apenas os operadores que aparecem na visão de equipe (exclui gestores sem função de operador)
export const OPERADORES_DISPLAY = OPERADORES.filter((op) => !op.ocultar)

export function getOperadorPorId(id: number) {
  return OPERADORES.find((op) => op.id === id) ?? null
}

export function getOperadorPorUsername(username: string) {
  return OPERADORES.find((op) => op.username === username) ?? null
}

export function getIniciaisNome(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

// Paleta de 12 cores vibrantes para avatares
const PALETTE = [
  { bg: '#7c3aed', border: '#a78bfa' },  // violet    — id 1
  { bg: '#2563eb', border: '#93c5fd' },  // blue      — id 2
  { bg: '#059669', border: '#6ee7b7' },  // emerald   — id 3
  { bg: '#d97706', border: '#fcd34d' },  // amber     — id 4 (Reyzo)
  { bg: '#e11d48', border: '#fda4af' },  // rose      — id 5
  { bg: '#0891b2', border: '#67e8f9' },  // cyan      — id 6
  { bg: '#a21caf', border: '#e879f9' },  // fuchsia   — id 7
  { bg: '#0f766e', border: '#5eead4' },  // teal      — id 8
  { bg: '#4338ca', border: '#a5b4fc' },  // indigo    — id 9
  { bg: '#ea580c', border: '#fdba74' },  // orange    — id 10
  { bg: '#0284c7', border: '#7dd3fc' },  // sky       — id 11
  { bg: '#be185d', border: '#f9a8d4' },  // pink      — id 12
]

/** Retorna estilo inline para avatares: fundo vibrante + borda colorida + texto branco. */
export function getAvatarStyle(id: number): { background: string; borderColor: string; color: string } {
  const c = PALETTE[(id - 1) % PALETTE.length]
  return { background: c.bg, borderColor: c.border, color: '#ffffff' }
}

/** @deprecated Use getAvatarStyle com inline styles. Mantido para transição. */
export function getCorAvatar(id: number): string {
  const NOMES = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-fuchsia-600', 'bg-teal-600',
    'bg-indigo-600', 'bg-orange-600', 'bg-sky-600', 'bg-pink-600',
  ]
  return NOMES[(id - 1) % NOMES.length]
}
