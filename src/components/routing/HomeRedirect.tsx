import { Navigate } from 'react-router-dom'
import { useIsDesktopApp } from '../../hooks/useIsDesktopApp'
import { useAppRole } from '../../contexts/RoleContext'

/** Home: desktop → Formulários; campo → Formulários; solicitante no celular → Solicitações. */
export default function HomeRedirect() {
  const isDesktop = useIsDesktopApp()
  const { isCampo } = useAppRole()

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

  if (isDesktop) return <Navigate to="/formularios" replace />
  if (isCampo) return <Navigate to="/formularios" replace />
  return <Navigate to="/solicitacoes" replace />
}
