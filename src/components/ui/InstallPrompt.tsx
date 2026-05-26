import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) return

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    setIsIOS(ios)

    if (ios) {
      const dismissed = localStorage.getItem('eme-install-dismissed')
      if (!dismissed) setVisible(true)
      return
    }

    const onInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      if (!localStorage.getItem('eme-install-dismissed')) setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onInstall)
    return () => window.removeEventListener('beforeinstallprompt', onInstall)
  }, [])

  const dismiss = () => {
    localStorage.setItem('eme-install-dismissed', '1')
    setVisible(false)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setVisible(false)
    setDeferred(null)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-50 no-print">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl p-2 flex-shrink-0" style={{ background: '#FFF0F4' }}>
            <Download size={20} style={{ color: '#C0014A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">Instalar app EME</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {isIOS
                ? 'Toque em Compartilhar → "Adicionar à Tela de Início" para usar como app.'
                : 'Instale no tablet ou celular para acesso rápido e offline.'}
            </p>
            {!isIOS && deferred && (
              <button
                onClick={install}
                className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #9B003C, #C0014A)' }}
              >
                Instalar agora
              </button>
            )}
          </div>
          <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
