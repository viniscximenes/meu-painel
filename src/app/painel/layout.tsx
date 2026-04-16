// O proxy já garante que só usuários autenticados chegam aqui.
// Este layout não faz redirect — evita loops.
export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
