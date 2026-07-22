import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppRole } from '../../contexts/RoleContext'

/** Bloqueia Solicitações para quem só preenche formulário via link. */
export default function SolicitanteOnly({ children }: { children: React.ReactNode }) {
  const { isCampo, markSolicitante } = useAppRole()

  useEffect(() => {
    if (!isCampo) markSolicitante()
  }, [isCampo, markSolicitante])

  if (isCampo) return <Navigate to="/formularios" replace />
  return children
}
