export interface PhotoCoords {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface PhotoMetadata {
  capturedAt: Date
  coords: PhotoCoords | null
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatCoordinates(coords: PhotoCoords): string {
  const lat = coords.latitude.toFixed(6)
  const lon = coords.longitude.toFixed(6)
  const acc = coords.accuracy != null ? ` (±${Math.round(coords.accuracy)}m)` : ''
  return `${lat}, ${lon}${acc}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = src
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

/** Obtém coordenadas GPS atuais (null se indisponível ou negado). */
export function getCurrentCoordinates(): Promise<PhotoCoords | null> {
  if (!navigator.geolocation) return Promise.resolve(null)

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    )
  })
}

function buildStampLines(meta: PhotoMetadata): string[] {
  const lines = [formatTimestamp(meta.capturedAt)]
  if (meta.coords) {
    lines.push(formatCoordinates(meta.coords))
  } else {
    lines.push('GPS indisponível')
  }
  return lines
}

/** Desenha data/hora e coordenadas no canto inferior esquerdo da imagem. */
export async function stampPhotoOnImage(
  dataUrl: string,
  meta: PhotoMetadata,
): Promise<string> {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.drawImage(img, 0, 0)

  const lines = buildStampLines(meta)
  const scale = Math.max(canvas.width, canvas.height) / 1080
  const fontSize = Math.round(Math.max(14, Math.min(44, 20 * scale)))
  const lineGap = Math.round(fontSize * 0.35)
  const padding = Math.round(Math.max(10, 14 * scale))
  const boxPad = Math.round(fontSize * 0.35)

  ctx.font = `600 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`

  const lineWidths = lines.map(l => ctx.measureText(l).width)
  const boxW = Math.max(...lineWidths) + boxPad * 2
  const boxH = lines.length * fontSize + (lines.length - 1) * lineGap + boxPad * 2
  const x = padding
  const y = canvas.height - padding - boxH

  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)'
  ctx.beginPath()
  const r = Math.round(4 * scale)
  ctx.roundRect(x, y, boxW, boxH, r)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    const lineY = y + boxPad + i * (fontSize + lineGap)
    ctx.fillText(line, x + boxPad, lineY)
  })

  return canvas.toDataURL('image/jpeg', 0.92)
}

/** @deprecated use stampPhotoOnImage */
export async function stampTimestampOnImage(
  dataUrl: string,
  capturedAt: Date = new Date(),
): Promise<string> {
  return stampPhotoOnImage(dataUrl, { capturedAt, coords: null })
}

/** Processa foto da câmera com carimbo de data/hora e coordenadas. */
export async function processCameraPhoto(
  file: File,
  prefetchedCoords?: Promise<PhotoCoords | null>,
): Promise<string> {
  const [dataUrl, coords] = await Promise.all([
    fileToDataUrl(file),
    prefetchedCoords ?? getCurrentCoordinates(),
  ])
  const capturedAt = new Date(file.lastModified || Date.now())
  return stampPhotoOnImage(dataUrl, { capturedAt, coords })
}

/** Processa foto da galeria sem carimbo. */
export async function processGalleryPhoto(file: File): Promise<string> {
  return fileToDataUrl(file)
}
