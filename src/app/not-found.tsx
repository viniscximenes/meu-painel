import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-slate-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Página não encontrada</h1>
        <p className="text-slate-500 mb-8">
          A página que você está procurando não existe ou foi removida.
        </p>
        <Link href="/painel" className="btn-primary inline-flex items-center gap-2">
          Voltar ao painel
        </Link>
      </div>
    </main>
  )
}
