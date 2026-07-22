import { Navigate } from 'react-router-dom'
import { useIsDesktopApp } from '../../hooks/useIsDesktopApp'

/** Rotas da página geral — só no desktop; no celular/PWA redireciona para Solicitações. */
export default function DesktopOnly({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktopApp()

  if (isDesktop === null) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div
          className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full"
          style={{ borderColor: '#C0014A', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!isDesktop) return <Navigate to="/solicitacoes" replace />
  return children
}
