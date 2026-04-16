import { NextResponse, type NextRequest } from 'next/server'
import { checkSession } from '@/lib/supabase/middleware'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protege apenas rotas /painel
  if (pathname.startsWith('/painel') && !checkSession(request)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/painel/:path*'],
}
