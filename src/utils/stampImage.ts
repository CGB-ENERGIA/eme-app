export interface PhotoCoords {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
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

export function formatTimestamp(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Linhas de texto para overlay na tela e carimbo na foto. */
export function getStampLines(meta: PhotoMetadata): StampLine[] {
  const lines: StampLine[] = [{ text: formatTimestamp(meta.capturedAt) }]

  if (meta.incidente?.trim()) {
    lines.push({ text: `INC - ${meta.incidente.trim()}` })
  }
  if (meta.equipe?.trim()) {
    lines.push({ text: `Equipe: ${meta.equipe.trim()}` })
  }

  if (meta.coords) {
    const acc =
      meta.coords.accuracy != null ? ` ${formatGpsAccuracy(meta.coords.accuracy)}` : ''
    lines.push({
      text: `Lat: ${formatGpsCoord(meta.coords.latitude)}  Lon: ${formatGpsCoord(meta.coords.longitude)}${acc}`,
      large: true,
    })
  } else {
    lines.push({ text: 'GPS indisponível', large: true })
  }

  return lines
}

const STAMP_FONT = '700 %dpx Inter, system-ui, -apple-system, sans-serif'

function stampMetrics(width: number, _height: number) {
  // Escala pela largura da foto — evita carimbo maior que a imagem em retrato.
  const ref = width
  const baseFont = Math.round(Math.max(22, Math.min(52, ref * 0.038)))
  const largeFont = Math.round(Math.max(24, Math.min(44, ref * 0.034)))
  const lineGap = Math.round(baseFont * 0.2)
  const largeGap = Math.round(largeFont * 0.16)
  const padding = Math.round(Math.max(8, ref * 0.012))
  const textPad = Math.round(baseFont * 0.15)
  const maxTextW = width - padding * 2 - textPad * 2
  return { baseFont, largeFont, lineGap, largeGap, padding, textPad, maxTextW }
}

function measureStampLines(
  ctx: CanvasRenderingContext2D,
  lines: StampLine[],
  baseFont: number,
  largeFont: number,
) {
  return lines.map(line => {
    const size = line.large ? largeFont : baseFont
    ctx.font = STAMP_FONT.replace('%d', String(size))
    return {
      width: ctx.measureText(line.text).width,
      height: size,
      size,
      large: line.large,
    }
  })
}

/** Reduz fontes até todas as linhas caberem na largura disponível. */
function fitStampFonts(
  ctx: CanvasRenderingContext2D,
  lines: StampLine[],
  baseFont: number,
  largeFont: number,
  maxTextW: number,
) {
  let b = baseFont
  let l = largeFont
  for (let attempt = 0; attempt < 24; attempt++) {
    const measured = measureStampLines(ctx, lines, b, l)
    const widest = Math.max(...measured.map(m => m.width))
    if (widest <= maxTextW) return { baseFont: b, largeFont: l, measured }
    b = Math.max(16, Math.floor(b * 0.92))
    l = Math.max(16, Math.floor(l * 0.92))
  }
  return { baseFont: b, largeFont: l, measured: measureStampLines(ctx, lines, b, l) }
}

function drawStampLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
) {
  ctx.font = STAMP_FONT.replace('%d', String(size))
  ctx.textBaseline = 'top'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = Math.max(2, size * 0.09)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)'
  ctx.fillStyle = '#ffffff'
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}

function drawStampOnContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  meta: PhotoMetadata,
) {
  const lines = getStampLines(meta)
  const { baseFont, largeFont, lineGap, largeGap, padding, textPad, maxTextW } =
    stampMetrics(width, height)

  const { baseFont: fitBase, largeFont: fitLarge, measured } = fitStampFonts(
    ctx,
    lines,
    baseFont,
    largeFont,
    maxTextW,
  )

  let blockH = textPad * 2
  measured.forEach((m, i) => {
    blockH += m.height
    if (i < measured.length - 1) {
      blockH += m.large || measured[i + 1]?.large ? largeGap : lineGap
    }
  })

  const x = padding + textPad
  let cursorY = height - padding - blockH + textPad

  lines.forEach((line, i) => {
    const m = measured[i]
    const size = line.large ? fitLarge : fitBase
    drawStampLine(ctx, line.text, x, cursorY, size)
    if (i < lines.length - 1) {
      cursorY += m.height + (line.large || lines[i + 1]?.large ? largeGap : lineGap)
    }
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

const GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 30_000,
} as const

/** Precisão alvo (metros) — para de refinar quando atingida. */
const TARGET_ACCURACY_M = 5

/** Formata coordenada com precisão máxima útil do GPS (~1 cm). */
export function formatGpsCoord(value: number): string {
  return value.toFixed(7)
}

/** Formata incerteza do GPS. */
export function formatGpsAccuracy(accuracy: number): string {
  return accuracy < 20 ? `±${accuracy.toFixed(1)}m` : `±${Math.round(accuracy)}m`
}

function pickBetterCoords(a: PhotoCoords | null, b: PhotoCoords | null): PhotoCoords | null {
  if (!b) return a
  if (!a) return b
  const aAcc = a.accuracy ?? Number.POSITIVE_INFINITY
  const bAcc = b.accuracy ?? Number.POSITIVE_INFINITY
  return bAcc < aAcc ? b : a
}

function coordsFromPosition(pos: {
  coords: {
    latitude: number
    longitude: number
    accuracy?: number | null
    altitude?: number | null
  }
}): PhotoCoords {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
    altitude: pos.coords.altitude ?? undefined,
  }
}

async function ensureLocationPermission(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation')
      const perm = await Geolocation.checkPermissions()
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions()
        return req.location === 'granted'
      }
      return true
    }
  } catch {
    /* fallback para navegador */
  }
  return true
}

export interface CoordsWatcher {
  stop: () => void
  getBest: () => PhotoCoords | null
}

/**
 * Monitora GPS continuamente e mantém sempre o fix de maior precisão
 * (menor valor de accuracy em metros).
 */
export function startCoordsWatcher(onUpdate?: (coords: PhotoCoords) => void): CoordsWatcher {
  let best: PhotoCoords | null = null
  let stopped = false
  let watchId: string | number | undefined
  let nativeWatch = false

  const apply = (coords: PhotoCoords) => {
    const next = pickBetterCoords(best, coords)
    if (next !== best) {
      best = next
      if (best) onUpdate?.(best)
    }
  }

  const stop = () => {
    if (stopped) return
    stopped = true
    void (async () => {
      try {
        if (nativeWatch && watchId != null) {
          const { Geolocation } = await import('@capacitor/geolocation')
          await Geolocation.clearWatch({ id: String(watchId) })
        } else if (watchId != null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId as number)
        }
      } catch {
        /* ignore */
      }
    })()
  }

  void (async () => {
    const allowed = await ensureLocationPermission()
    if (!allowed || stopped) return

    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation')
        nativeWatch = true
        watchId = await Geolocation.watchPosition(GPS_OPTIONS, (pos, err) => {
          if (stopped || err || !pos) return
          apply(coordsFromPosition(pos))
        })
        return
      }
    } catch {
      /* fallback para navegador */
    }

    if (!navigator.geolocation || stopped) return

    watchId = navigator.geolocation.watchPosition(
      (pos) => apply(coordsFromPosition(pos)),
      () => {},
      GPS_OPTIONS,
    )
  })()

  return { stop, getBest: () => best }
}

/**
 * Aguarda o melhor fix possível dentro do tempo limite,
 * refinando a posição enquanto o GPS estabiliza.
 */
export function getBestCoordinates(maxWaitMs = 20_000): Promise<PhotoCoords | null> {
  return new Promise((resolve) => {
    let settled = false
    let watcher!: CoordsWatcher

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      watcher.stop()
      resolve(watcher.getBest())
    }

    watcher = startCoordsWatcher((coords) => {
      if (coords.accuracy != null && coords.accuracy <= TARGET_ACCURACY_M) {
        finish()
      }
    })

    const timer = setTimeout(finish, maxWaitMs)
  })
}

/** Obtém coordenadas GPS atuais (null se indisponível ou negado). */
export async function getCurrentCoordinates(): Promise<PhotoCoords | null> {
  return getBestCoordinates(20_000)
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
  drawStampOnContext(ctx, canvas.width, canvas.height, meta)

  return canvas.toDataURL('image/jpeg', 0.92)
}

/** Captura frame do vídeo ao vivo e aplica carimbo. */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  meta: PhotoMetadata,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')

  ctx.drawImage(video, 0, 0)
  drawStampOnContext(ctx, canvas.width, canvas.height, meta)

  return canvas.toDataURL('image/jpeg', 0.92)
}

/** Processa foto da câmera nativa (fallback) com carimbo completo. */
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

export function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}
