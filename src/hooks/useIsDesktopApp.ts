import { useEffect, useState } from 'react'

/**
 * Página geral (desktop no navegador, ≥1024px): app completo.
 * PWA / celular / tablet: fluxo de campo (Solicitações).
 * PWA instalada (standalone) também conta como campo, mesmo em tela larga.
 */
export function useIsDesktopApp(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null
    return computeIsDesktop()
  })

  useEffect(() => {
    const desktopMq = window.matchMedia('(min-width: 1024px)')
    const standaloneMq = window.matchMedia(
      '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)',
    )

    const update = () => setIsDesktop(computeIsDesktop())
    update()

    desktopMq.addEventListener('change', update)
    standaloneMq.addEventListener('change', update)
    return () => {
      desktopMq.removeEventListener('change', update)
      standaloneMq.removeEventListener('change', update)
    }
  }, [])

  return isDesktop
}

function computeIsDesktop(): boolean {
  const wide = window.matchMedia('(min-width: 1024px)').matches
  const standalone = window.matchMedia(
    '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)',
  ).matches
  // iOS Safari instalado às vezes não dispara display-mode; navigator.standalone cobre
  const iosStandalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return wide && !standalone && !iosStandalone
}
