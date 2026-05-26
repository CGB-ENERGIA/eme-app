export interface PhotoCoords {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface PhotoStampContext {
  incidente?: string
  equipe?: string
}

export interface PhotoMetadata extends PhotoStampContext {
  capturedAt: Date
  coords: PhotoCoords | null
}

interface StampLine {
  text: string
  large?: boolean
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
export async function getCurrentCoordinates(): Promise<PhotoCoords | null> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation')
      const perm = await Geolocation.checkPermissions()
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions()
        if (req.location !== 'granted') return null
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12_000,
      })
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }
    }
  } catch {
    /* fallback para navegador */
  }

  if (!navigator.geolocation) return null

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

function buildStampLines(meta: PhotoMetadata): StampLine[] {
  const lines: StampLine[] = [{ text: formatTimestamp(meta.capturedAt) }]

  if (meta.incidente?.trim()) {
    lines.push({ text: `INC - ${meta.incidente.trim()}` })
  }
  if (meta.equipe?.trim()) {
    lines.push({ text: `Equipe: ${meta.equipe.trim()}` })
  }

  if (meta.coords) {
    const acc = meta.coords.accuracy != null ? ` (±${Math.round(meta.coords.accuracy)}m)` : ''
    lines.push({ text: `Lat: ${meta.coords.latitude.toFixed(6)}`, large: true })
    lines.push({ text: `Lon: ${meta.coords.longitude.toFixed(6)}${acc}`, large: true })
  } else {
    lines.push({ text: 'GPS indisponível', large: true })
  }

  return lines
}

/** Desenha data/hora, INC, equipe e coordenadas na imagem. */
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
  const baseFont = Math.round(Math.max(18, Math.min(52, 24 * scale)))
  const largeFont = Math.round(baseFont * 1.45)
  const lineGap = Math.round(baseFont * 0.28)
  const largeGap = Math.round(largeFont * 0.22)
  const padding = Math.round(Math.max(12, 16 * scale))
  const boxPad = Math.round(baseFont * 0.4)

  const measureLine = (line: StampLine) => {
    const size = line.large ? largeFont : baseFont
    ctx.font = `700 ${size}px Inter, system-ui, -apple-system, sans-serif`
    return { width: ctx.measureText(line.text).width, height: size, size, large: line.large }
  }

  const measured = lines.map(measureLine)
  const boxW = Math.max(...measured.map(m => m.width)) + boxPad * 2
  let boxH = boxPad * 2
  measured.forEach((m, i) => {
    boxH += m.height
    if (i < measured.length - 1) boxH += m.large || measured[i + 1]?.large ? largeGap : lineGap
  })

  const x = padding
  const y = canvas.height - padding - boxH

  ctx.fillStyle = 'rgba(0, 0, 0, 0.68)'
  ctx.beginPath()
  const r = Math.round(6 * scale)
  ctx.roundRect(x, y, boxW, boxH, r)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'top'
  let cursorY = y + boxPad
  lines.forEach((line, i) => {
    const m = measured[i]
    ctx.font = `700 ${m.size}px Inter, system-ui, -apple-system, sans-serif`
    ctx.fillText(line.text, x + boxPad, cursorY)
    if (i < lines.length - 1) {
      cursorY += m.height + (line.large || lines[i + 1]?.large ? largeGap : lineGap)
    }
  })

  return canvas.toDataURL('image/jpeg', 0.92)
}

/** Processa foto da câmera com carimbo completo. */
export async function processCameraPhoto(
  file: File,
  prefetchedCoords?: Promise<PhotoCoords | null>,
  context?: PhotoStampContext,
): Promise<string> {
  const [dataUrl, coords] = await Promise.all([
    fileToDataUrl(file),
    prefetchedCoords ?? getCurrentCoordinates(),
  ])
  const capturedAt = new Date(file.lastModified || Date.now())
  return stampPhotoOnImage(dataUrl, { capturedAt, coords, ...context })
}

/** Processa foto da galeria sem carimbo. */
export async function processGalleryPhoto(file: File): Promise<string> {
  return fileToDataUrl(file)
}
