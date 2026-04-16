export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid rgba(201,168,76,0.15)', borderTopColor: 'var(--gold)' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      </div>
    </div>
  )
}
