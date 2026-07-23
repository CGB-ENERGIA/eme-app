import { sincronizarTudo } from '../store/db'

export const EME_SYNC_EVENT = 'eme-sync'

export type EmeSyncDetail = {
  status: 'start' | 'ok' | 'error' | 'skip'
  reason?: string
  enviados?: number
  total?: number
  erro?: string
}

function emit(detail: EmeSyncDetail) {
  window.dispatchEvent(new CustomEvent(EME_SYNC_EVENT, { detail }))
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let lastAutoSyncAt = 0
const MIN_INTERVAL_MS = 30_000

/** Agenda sync automático (debounce para evitar rajadas de eventos). */
export function agendarAutoSync(reason: string, delayMs = 600) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void executarAutoSync(reason)
  }, delayMs)
}

export async function executarAutoSync(reason: string) {
  if (!navigator.onLine) {
    emit({ status: 'skip', reason })
    return
  }

  const force = reason === 'online'
  const agora = Date.now()
  if (!force && agora - lastAutoSyncAt < MIN_INTERVAL_MS) {
    emit({ status: 'skip', reason })
    return
  }

  lastAutoSyncAt = agora
  emit({ status: 'start', reason })

  try {
    const result = await sincronizarTudo()
    if (result.ok) {
      emit({
        status: 'ok',
        reason,
        enviados: result.enviados,
        total: result.total,
      })
    } else {
      emit({
        status: 'error',
        reason,
        enviados: result.enviados,
        total: result.total,
        erro: result.erro,
      })
    }
  } catch (err) {
    emit({
      status: 'error',
      reason,
      erro: err instanceof Error ? err.message : 'Falha na sincronização automática',
    })
  }
}

/** Escuta reconexão e retorno ao app; retorna cleanup. */
export function iniciarAutoSync(): () => void {
  const onOnline = () => agendarAutoSync('online', 400)

  const onVisible = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      agendarAutoSync('visible', 1200)
    }
  }

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }
}
