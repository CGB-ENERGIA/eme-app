import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { initNativeApp } from './utils/capacitor'
import { initTelemetry } from './utils/telemetry'

/** PWA: com registerType autoUpdate, aplica a nova versão e recarrega sozinha.
 *  Sem checagem periódica, o SW instalado pode ficar dias sem buscar update. */
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    const checkForUpdate = () => {
      void registration.update()
    }

    // Ao voltar para o app (comum em PWA instalada)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })

    // Enquanto o app estiver aberto (campo costuma deixar em segundo plano)
    window.setInterval(checkForUpdate, 60_000)
  },
})
initNativeApp()
void initTelemetry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
