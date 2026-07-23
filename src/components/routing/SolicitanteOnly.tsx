import { useLayoutEffect } from 'react'
import { useAppRole } from '../../contexts/RoleContext'

/**
 * Abrir /solicitacoes = possui o link → libera perfil solicitante.
 * (Não redireciona quem estava como "campo"; o próprio link concede o acesso.)
 */
export default function SolicitanteOnly({ children }: { children: React.ReactNode }) {
  const { markSolicitante } = useAppRole()

  useLayoutEffect(() => {
    markSolicitante()
  }, [markSolicitante])

  return children
}
