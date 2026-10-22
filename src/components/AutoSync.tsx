import { useEffect } from 'react'
import { iniciarAutoSync } from '../lib/autoSync'
import { limparFormulariosAntigosUmaVez } from '../store/db'

/** Mantém sync automático ao recuperar internet / voltar ao app. */
export default function AutoSync() {
  useEffect(() => {
    void limparFormulariosAntigosUmaVez()
    return iniciarAutoSync()
  }, [])
  return null
}
