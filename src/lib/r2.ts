import { supabase } from './supabaseClient'

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string
const UPLOAD_SECRET = import.meta.env.VITE_UPLOAD_SECRET as string

function isR2Configured() {
  return Boolean(WORKER_URL && UPLOAD_SECRET)
}

// Converte data URL base64 para Blob
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bytes = atob(data)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return new Blob([buffer], { type: mime })
}

/** True se já é URL hospedada (não data URL / base64). */
export function isRemoteUrl(value: string | null | undefined): boolean {
  if (!value) return false
  return value.startsWith('http://') || value.startsWith('https://')
}

async function uploadViaSupabase(key: string, dataUrl: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase não configurado — impossível enviar fotos ao banco')
  }

  const blob = dataUrlToBlob(dataUrl)
  const { error } = await supabase.storage.from('eme-fotos').upload(key, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: true,
  })
  if (error) throw new Error(`Upload Storage falhou: ${error.message}`)

  const { data } = supabase.storage.from('eme-fotos').getPublicUrl(key)
  if (!data.publicUrl) throw new Error('Não foi possível obter URL pública da foto')
  return data.publicUrl
}

async function uploadViaR2(key: string, dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl)
  const url = `${WORKER_URL}/${key}`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': blob.type,
      'X-Upload-Secret': UPLOAD_SECRET,
    },
    body: blob,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`R2 upload falhou (${res.status}): ${err}`)
  }

  const json = (await res.json()) as { url: string }
  return json.url
}

/** Upload de foto base64 → URL remota (R2 se configurado, senão Supabase Storage). */
export async function uploadFoto(key: string, dataUrl: string): Promise<string> {
  if (isRemoteUrl(dataUrl)) return dataUrl

  if (isR2Configured()) {
    try {
      return await uploadViaR2(key, dataUrl)
    } catch (err) {
      // Fallback: Storage do Supabase se o Worker R2 falhar
      console.warn('[fotos] R2 falhou, tentando Supabase Storage', err)
      return uploadViaSupabase(key, dataUrl)
    }
  }

  return uploadViaSupabase(key, dataUrl)
}

// Remove uma foto do R2 (Storage cleanup opcional — ignorado se só Supabase)
export async function deleteFoto(key: string): Promise<void> {
  if (isR2Configured()) {
    await fetch(`${WORKER_URL}/${key}`, {
      method: 'DELETE',
      headers: { 'X-Upload-Secret': UPLOAD_SECRET },
    })
    return
  }
  if (supabase) {
    await supabase.storage.from('eme-fotos').remove([key])
  }
}

type FotoMap = Record<string, string>

export async function uploadFotosFormulario(
  formId: string,
  fotos: FotoMap
): Promise<FotoMap> {
  const resultado: FotoMap = {}
  const uploads = Object.keys(fotos).map(async (campo) => {
    const valor: string = fotos[campo]
    if (!valor) return
    if (isRemoteUrl(valor)) {
      resultado[campo] = valor
      return
    }
    const ext = valor.startsWith('data:image/png') ? 'png' : 'jpg'
    const key = `fotos/${formId}/${campo}.${ext}`
    resultado[campo] = await uploadFoto(key, valor)
  })

  await Promise.all(uploads)
  return resultado
}
