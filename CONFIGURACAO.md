# Guia de Configuração — Meu Painel

## 1. Instalar dependências

```bash
npm install
```

---

## 2. Configurar Supabase

### 2.1 Criar projeto
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **URL do projeto** e a **anon key** (Settings → API)

### 2.2 Executar o schema
No **SQL Editor** do Supabase Dashboard, execute o conteúdo de:
```
supabase/schema.sql
```

### 2.3 Criar os usuários
No **SQL Editor**, execute o conteúdo de:
```
supabase/seed.sql
```
> Senha padrão de todos os usuários: `Painel@2024`

Ou crie manualmente em **Authentication → Users → Add user**, passando nos metadados:
```json
// Para o gestor:
{ "nome": "Gestor Principal", "role": "gestor", "operador_id": null }

// Para operador (ex: Ana Silva, id=1):
{ "nome": "Ana Silva", "role": "operador", "operador_id": 1 }
```

---

## 3. Configurar Google Sheets

### 3.1 Criar Service Account
1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ou use um existente)
3. Ative a **Google Sheets API**
4. Vá em **IAM & Admin → Service Accounts → Create**
5. Crie uma chave JSON e baixe o arquivo

### 3.2 Compartilhar a planilha
- Abra sua planilha no Google Sheets
- Compartilhe com o **e-mail da Service Account** (ex: `minha-conta@projeto.iam.gserviceaccount.com`) com permissão de **Leitura**

### 3.3 Estrutura esperada da planilha
A planilha deve ter **pelo menos duas abas**:

**Aba `Dados`** — dados individuais por operador:
| operador_id | nome | coluna1 | coluna2 | ... |
|------------|------|---------|---------|-----|
| 1 | Ana Silva | valor | valor | ... |
| 2 | Bruno Costa | valor | valor | ... |

**Aba `Resumo`** — resumo por operador (para os cards do gestor):
| operador_id | nome | metrica1 | metrica2 |
|------------|------|----------|----------|
| 1 | Ana Silva | 150 | 98% |

---

## 4. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key

GOOGLE_SHEETS_SPREADSHEET_ID=id_da_planilha
GOOGLE_SERVICE_ACCOUNT_EMAIL=conta@projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----\n"
```

> O ID da planilha está na URL: `docs.google.com/spreadsheets/d/**ID_AQUI**/edit`

---

## 5. Rodar localmente

```bash
npm run dev
```
Acesse: http://localhost:3000

---

## 6. Deploy na Vercel

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Faça o deploy
vercel

# Configure as mesmas variáveis de ambiente no painel da Vercel:
# Settings → Environment Variables
```

Ou conecte o repositório GitHub diretamente em [vercel.com](https://vercel.com) e configure as variáveis em **Settings → Environment Variables**.

---

## Estrutura de arquivos

```
src/
├── app/
│   ├── login/          # Página de login
│   ├── painel/         # Área protegida
│   │   ├── page.tsx    # Dashboard (gestor ou operador)
│   │   └── operadores/
│   │       ├── page.tsx        # Lista todos (gestor)
│   │       └── [id]/page.tsx   # Detalhe do operador
│   └── api/sheets/     # API Route para Google Sheets
├── components/         # Componentes reutilizáveis
├── lib/
│   ├── supabase/       # Clientes Supabase
│   ├── auth.ts         # Helpers de autenticação
│   ├── sheets.ts       # Integração Google Sheets
│   └── operadores.ts   # Lista dos 13 operadores
└── types/              # TypeScript types
supabase/
├── schema.sql          # Tabelas e políticas RLS
└── seed.sql            # Usuários de exemplo
```
