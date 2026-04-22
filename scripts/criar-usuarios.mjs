// ============================================================
// Script: criar-usuarios.mjs
// Cria todos os usuários via Supabase Admin API
// Uso: node scripts/criar-usuarios.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Lê o .env.local manualmente (sem depender de dotenv)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

function loadEnv(path) {
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    console.error('❌  Não foi possível ler .env.local')
    process.exit(1)
  }
}

loadEnv(envPath)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`
❌  Variáveis de ambiente ausentes no .env.local:
    NEXT_PUBLIC_SUPABASE_URL   → ${SUPABASE_URL ? '✓' : 'FALTANDO'}
    SUPABASE_SERVICE_ROLE_KEY  → ${SERVICE_ROLE_KEY ? '✓' : 'FALTANDO'}

Adicione a service_role key em .env.local:
    SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
(Supabase Dashboard → Settings → API → service_role)
`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SENHA_PADRAO = 'Painel@2024'

const USUARIOS = [
  // ── Gestores ────────────────────────────────────────────
  {
    email: 'ana.angelica@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Ana Angélica', role: 'gestor', operador_id: null },
  },
  {
    email: 'caio.vsilva@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Caio V. Silva', role: 'gestor', operador_id: null },
  },

  // ── Operadores ───────────────────────────────────────────
  {
    email: 'samyrha.fenix@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Samyrha Fenix', role: 'operador', operador_id: 1 },
  },
  {
    email: 'marcos.psilva@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Marcos P. Silva', role: 'operador', operador_id: 2 },
  },
  {
    email: 'bruno.roberto@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Bruno Roberto', role: 'operador', operador_id: 3 },
  },
  {
    email: 'reyzo.deus@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Reyzo Deus', role: 'operador', operador_id: 4 },
  },
  {
    email: 'kaian.alfradique@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Kaian Alfradique', role: 'operador', operador_id: 5 },
  },
  {
    email: 'edna.desouza@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Edna de Souza', role: 'operador', operador_id: 6 },
  },
  {
    email: 'sara.secundo@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Sara Secundo', role: 'operador', operador_id: 7 },
  },
  {
    email: 'igor.souza@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Igor Souza', role: 'operador', operador_id: 8 },
  },
  {
    email: 'willian.souza@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Willian Souza', role: 'operador', operador_id: 9 },
  },
  {
    email: 'thyelen.azevedo@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Thyelen Azevedo', role: 'operador', operador_id: 10 },
  },
  {
    email: 'barbara.vilela@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Barbara Vilela', role: 'operador', operador_id: 11 },
  },
  {
    email: 'vitor.halmeida@painel.app',
    password: SENHA_PADRAO,
    user_metadata: { nome: 'Vitor H. Almeida', role: 'operador', operador_id: 12 },
  },
  {
    email: 'thais.correa@alloha.com',
    password: 'Painel@2024',
    user_metadata: { nome: 'Thais Rodrigues Correa', role: 'operador', operador_id: 15 },
  },
]

async function criarUsuarios() {
  console.log(`\n🚀  Criando ${USUARIOS.length} usuários em ${SUPABASE_URL}\n`)

  let sucessos = 0
  let falhas = 0

  for (const usuario of USUARIOS) {
    const username = usuario.email.split('@')[0]

    const { data, error } = await supabase.auth.admin.createUser({
      email: usuario.email,
      password: usuario.password,
      email_confirm: true,          // já confirma o email automaticamente
      user_metadata: usuario.user_metadata,
    })

    if (error) {
      // Usuário já existe → não é erro crítico
      if (error.message.includes('already been registered') || error.code === 'email_exists') {
        console.log(`  ⚠️   ${username} — já existe, ignorado`)
      } else {
        console.log(`  ❌  ${username} — ${error.message}`)
        console.log(`       código: ${error.code ?? 'n/a'}  status: ${error.status ?? 'n/a'}`)
        console.log(`       detalhe:`, JSON.stringify(error, null, 2))
        falhas++
      }
    } else {
      const role = usuario.user_metadata.role
      const id = usuario.user_metadata.operador_id
      console.log(`  ✓   ${username.padEnd(22)} ${role}${id ? ` #${id}` : '     '}  (${data.user.id.slice(0, 8)}…)`)
      sucessos++
    }
  }

  console.log(`
────────────────────────────────────────
  ✓ Criados:  ${sucessos}
  ✗ Falhas:   ${falhas}
  Total:      ${USUARIOS.length}
────────────────────────────────────────

Login no painel:
  URL:   http://localhost:3000/login
  Senha: ${SENHA_PADRAO}

  Gestores:   ana.angelica  /  caio.vsilva
  Operadores: samyrha.fenix, marcos.psilva, ...
`)
}

criarUsuarios().catch((err) => {
  console.error('Erro inesperado:', err)
  process.exit(1)
})
