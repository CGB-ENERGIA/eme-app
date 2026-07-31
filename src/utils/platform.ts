import { Capacitor } from '@capacitor/core'

/** true em celular/tablet (app nativo ou navegador móvel) — usado para decidir
 *  quando abrir a folha de compartilhamento nativa (Web Share API) em vez do
 *  download direto. No desktop, o Share API do Chromium abre uma janela do SO
 *  que às vezes não conclui o download — melhor baixar direto. */
export function isMobileDevice(): boolean {
  if (Capacitor.isNativePlatform()) return true
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}
