import { NextResponse, type NextRequest } from 'next/server'

// Verifica sessão apenas pelo cookie — sem chamada de rede.
// A verificação real do token acontece nos Server Components via createClient().
export function checkSession(request: NextRequest): boolean {
  // @supabase/ssr nomeia os cookies como sb-<ref>-auth-token (pode ser chunked)
  return request.cookies.getAll().some((c) =>
    c.name.includes('auth-token') && c.value.length > 0
  )
}
