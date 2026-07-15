const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string
const UPLOAD_SECRET = import.meta.env.VITE_UPLOAD_SECRET as string

function isConfigured() {
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

// Retorna true se o valor é uma URL já hospedada (não base64)
export function isRemoteUrl(value: string | null | undefined): value is string {
  if (!value) return false
  return value.startsWith('http://') || value.startsWith('https://')
}

// Faz upload de uma foto base64 para o R2 via Worker
// key: ex. "fotos/formId/chegada-base.jpg"
export async function uploadFoto(key: string, dataUrl: string): Promise<string> {
  if (!isConfigured()) {
    console.warn('[r2] Worker URL ou secret não configurados — pulando upload')
    return dataUrl
  }

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

// Remove uma foto do R2
export async function deleteFoto(key: string): Promise<void> {
  if (!isConfigured()) return
  await fetch(`${WORKER_URL}/${key}`, {
    method: 'DELETE',
    headers: { 'X-Upload-Secret': UPLOAD_SECRET },
  })
}

// Extrai todas as fotos base64 de um formulário, faz upload e retorna
// um mapa campo → URL remota
type FotoMap = Record<string, string>

export async function uploadFotosFormulario(
  formId: string,
  fotos: FotoMap
): Promise<FotoMap> {
  if (!isConfigured()) return fotos

  const resultado: FotoMap = {}
  const uploads = Object.keys(fotos).map(async (campo) => {
    const valor: string = fotos[campo]
    if (!valor || valor.startsWith('http://') || valor.startsWith('https://')) {
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
