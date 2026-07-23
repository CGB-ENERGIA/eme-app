import { useEffect } from 'react'
import { iniciarAutoSync } from '../lib/autoSync'

/** Mantém sync automático ao recuperar internet / voltar ao app. */
export default function AutoSync() {
  useEffect(() => iniciarAutoSync(), [])
  return null
}
