import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type AppRole = 'solicitante' | 'campo'

/** v2: padrão = campo; Solicitações só após abrir /solicitacoes. */
const STORAGE_KEY = 'eme-app-role-v2'

interface RoleContextValue {
  role: AppRole
  isCampo: boolean
  isSolicitante: boolean
  /** Equipe de campo: preenche formulário via link — sem Solicitações. */
  markCampo: () => void
  /** Quem abre/cria solicitações e gerencia formulários. */
  markSolicitante: () => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

function readStoredRole(): AppRole {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'campo' || v === 'solicitante') return v
  } catch {
    /* ignore */
  }
  // Padrão: equipe de campo. Guia Solicitações só após visitar /solicitacoes.
  return 'campo'
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>(() => readStoredRole())

  const markCampo = useCallback(() => {
    setRole('campo')
    try { localStorage.setItem(STORAGE_KEY, 'campo') } catch { /* ignore */ }
  }, [])

  const markSolicitante = useCallback(() => {
    setRole('solicitante')
    try { localStorage.setItem(STORAGE_KEY, 'solicitante') } catch { /* ignore */ }
  }, [])

  const value = useMemo(
    () => ({
      role,
      isCampo: role === 'campo',
      isSolicitante: role === 'solicitante',
      markCampo,
      markSolicitante,
    }),
    [role, markCampo, markSolicitante],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useAppRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useAppRole must be used within RoleProvider')
  return ctx
}
