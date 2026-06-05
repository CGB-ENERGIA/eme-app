type ErrorContext = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    __SENTRY_LOADED__?: boolean
  }
}

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

async function ensureSentryLoaded() {
  if (!SENTRY_DSN || window.__SENTRY_LOADED__) return
  const Sentry = await import('@sentry/react')
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [],
    tracesSampleRate: 0,
  })
  window.__SENTRY_LOADED__ = true
}

export async function initTelemetry() {
  try {
    await ensureSentryLoaded()
  } catch {
    // No-op: telemetry deve ser silenciosa se falhar
  }
}

export function logError(error: unknown, context?: ErrorContext) {
  const payload = { error, context }
  console.error('[telemetry]', payload)
  void (async () => {
    if (!SENTRY_DSN) return
    try {
      await ensureSentryLoaded()
      const Sentry = await import('@sentry/react')
      Sentry.withScope((scope) => {
        if (context) {
          for (const [key, value] of Object.entries(context)) {
            scope.setExtra(key, value)
          }
        }
        Sentry.captureException(error)
      })
    } catch {
      // manter falha silenciosa
    }
  })()
}
