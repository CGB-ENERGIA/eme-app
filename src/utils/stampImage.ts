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
  coords?: boolean
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
      text: `Lat: ${formatGpsCoord(meta.coords.latitude)}`,
      large: true,
      coords: true,
    })
    lines.push({
      text: `Lon: ${formatGpsCoord(meta.coords.longitude)}${acc}`,
      large: true,
      coords: true,
    })
  } else {
    lines.push({ text: 'GPS indisponível', large: true })
  }

  return lines
}

const STAMP_FONT = '700 %dpx Inter, system-ui, -apple-system, sans-serif'
const STAMP_FONT_COORDS =
  '700 %dpx "SF Mono", "Cascadia Mono", "Segoe UI Mono", Consolas, monospace'

function stampFont(size: number, coords?: boolean) {
  return (coords ? STAMP_FONT_COORDS : STAMP_FONT).replace('%d', String(size))
}

function stampMetrics(width: number, _height: number) {
  const ref = width
  const baseFont = Math.round(Math.max(34, Math.min(76, ref * 0.058)))
  const largeFont = Math.round(Math.max(32, Math.min(72, ref * 0.054)))
  const lineGap = Math.round(baseFont * 0.22)
  const largeGap = Math.round(largeFont * 0.2)
  const padding = Math.round(Math.max(10, ref * 0.014))
  const textPad = Math.round(baseFont * 0.12)
  const maxTextW = width - padding * 2 - textPad * 2
  return { baseFont, largeFont, lineGap, largeGap, padding, textPad, maxTextW }
}

function measureStampLines(
  ctx: CanvasRenderingContext2D,
  lines: StampLine[],
  sizes: number[],
) {
  return lines.map((line, i) => {
    const size = sizes[i]
    ctx.font = stampFont(size, line.coords)
    if (line.coords && 'letterSpacing' in ctx) {
      ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.04em'
    }
    const width = ctx.measureText(line.text).width
    if (line.coords && 'letterSpacing' in ctx) {
      ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
    }
    return { width, height: size, size, large: line.large }
  })
}

/** Ajusta cada linha individualmente — evita comprimir tudo por causa do GPS. */
function fitStampLineSizes(
  ctx: CanvasRenderingContext2D,
  lines: StampLine[],
  baseFont: number,
  largeFont: number,
  maxTextW: number,
) {
  const minBase = 26
  const minLarge = 24

  const sizes = lines.map(line => (line.large ? largeFont : baseFont))

  lines.forEach((line, i) => {
    let size = sizes[i]
    const min = line.large ? minLarge : minBase
    ctx.font = stampFont(size, line.coords)
    if (line.coords && 'letterSpacing' in ctx) {
      ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.04em'
    }
    while (ctx.measureText(line.text).width > maxTextW && size > min) {
      size = Math.max(min, Math.floor(size * 0.96))
      ctx.font = stampFont(size, line.coords)
    }
    if (line.coords && 'letterSpacing' in ctx) {
      ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
    }
    sizes[i] = size
  })

  return { sizes, measured: measureStampLines(ctx, lines, sizes) }
}

function drawStampLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  coords?: boolean,
) {
  ctx.font = stampFont(size, coords)
  ctx.textBaseline = 'top'
  if (coords && 'letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.04em'
  }

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.shadowBlur = Math.max(6, size * 0.22)
  ctx.shadowOffsetX = Math.max(1, size * 0.05)
  ctx.shadowOffsetY = Math.max(2, size * 0.06)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, x, y)
  ctx.restore()

  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = Math.max(3, size * 0.12)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'
  ctx.fillStyle = '#ffffff'
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)

  if (coords && 'letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
  }
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

  const { sizes, measured } = fitStampLineSizes(
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
      blockH += lines[i].large || lines[i + 1]?.large ? largeGap : lineGap
    }
  })

  const x = padding + textPad
  let cursorY = height - padding - blockH + textPad

  lines.forEach((line, i) => {
    const m = measured[i]
    drawStampLine(ctx, line.text, x, cursorY, sizes[i], line.coords)
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
  timeout: 45_000,
} as const

/** Rejeita leituras de rede/Wi‑Fi imprecisas (ex.: ±100 km). */
const MAX_ACCEPTABLE_ACCURACY_M = 60
/** Precisão ideal para captura imediata. */
const IDEAL_ACCURACY_M = 10
/** Precisão alvo ao refinar. */
const TARGET_ACCURACY_M = 6
/** Amostras recentes usadas na média ponderada. */
const MAX_SAMPLE_AGE_MS = 50_000
const MAX_SAMPLES = 24
/** Distância máxima entre leituras consecutivas (salto rejeitado). */
const MAX_JUMP_FACTOR = 2.5

interface GpsSample extends PhotoCoords {
  timestamp: number
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function isValidCoords(coords: PhotoCoords): boolean {
  return (
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude) &&
    Math.abs(coords.latitude) <= 90 &&
    Math.abs(coords.longitude) <= 180
  )
}

/** Aceita apenas leituras com incerteza razoável. */
export function isAcceptableGpsReading(coords: PhotoCoords | null): coords is PhotoCoords {
  if (!coords || !isValidCoords(coords)) return false
  if (coords.accuracy == null || !Number.isFinite(coords.accuracy)) return false
  return coords.accuracy > 0 && coords.accuracy <= MAX_ACCEPTABLE_ACCURACY_M
}

export type GpsQuality = 'calibrating' | 'excellent' | 'good' | 'fair' | 'poor'

export function describeGpsStatus(coords: PhotoCoords | null): { quality: GpsQuality; message: string } {
  if (!coords || !isValidCoords(coords)) {
    return { quality: 'calibrating', message: 'Calibrando GPS — aguarde ao ar livre' }
  }
  const acc = coords.accuracy
  if (acc == null || acc > MAX_ACCEPTABLE_ACCURACY_M) {
    return { quality: 'poor', message: 'GPS impreciso — aguarde estabilizar' }
  }
  if (acc <= 8) return { quality: 'excellent', message: `GPS preciso ${formatGpsAccuracy(acc)}` }
  if (acc <= 18) return { quality: 'good', message: `GPS bom ${formatGpsAccuracy(acc)}` }
  if (acc <= 40) return { quality: 'fair', message: `GPS moderado ${formatGpsAccuracy(acc)} — aguarde` }
  return { quality: 'poor', message: `GPS fraco ${formatGpsAccuracy(acc)} — aguarde` }
}

function distanceMeters(a: PhotoCoords, b: PhotoCoords): number {
  const R = 6_371_000
  const φ1 = (a.latitude * Math.PI) / 180
  const φ2 = (b.latitude * Math.PI) / 180
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180
  const h =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function weightedCentroid(samples: GpsSample[]): PhotoCoords {
  let wSum = 0
  let latSum = 0
  let lonSum = 0
  let bestAcc = Number.POSITIVE_INFINITY

  for (const s of samples) {
    const acc = s.accuracy ?? MAX_ACCEPTABLE_ACCURACY_M
    const w = 1 / Math.max(4, acc * acc)
    wSum += w
    latSum += s.latitude * w
    lonSum += s.longitude * w
    bestAcc = Math.min(bestAcc, acc)
  }

  return {
    latitude: latSum / wSum,
    longitude: lonSum / wSum,
    accuracy: Math.max(3, bestAcc * 0.9),
    altitude: samples.find(s => s.altitude != null)?.altitude,
  }
}

function filterOutliers(samples: GpsSample[]): GpsSample[] {
  if (samples.length < 3) return samples
  const ref = weightedCentroid(samples)
  return samples.filter((s) => {
    const jump = distanceMeters(s, ref)
    const limit = Math.max(12, (s.accuracy ?? 20) * 1.8)
    return jump <= limit
  })
}

function stabilizeSamples(samples: GpsSample[], fallback: PhotoCoords | null): PhotoCoords | null {
  const valid = samples.filter(isAcceptableGpsReading)
  if (valid.length === 0) return isAcceptableGpsReading(fallback) ? fallback : null

  const filtered = filterOutliers(valid)
  const pool = filtered.length >= 2 ? filtered : valid

  if (pool.length >= 2) return weightedCentroid(pool.slice(-8))
  if (pool.length === 1 && (pool[0].accuracy ?? 999) <= IDEAL_ACCURACY_M) return pool[0]
  return isAcceptableGpsReading(fallback) ? fallback : pool[0]
}

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
  getStabilized: () => PhotoCoords | null
  sampleCount: () => number
}

async function fetchOneShotPosition(): Promise<PhotoCoords | null> {
  const allowed = await ensureLocationPermission()
  if (!allowed) return null

  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation')
      const pos = await Geolocation.getCurrentPosition(GPS_OPTIONS)
      const coords = coordsFromPosition(pos)
      return isAcceptableGpsReading(coords) ? coords : null
    }
  } catch {
    /* fallback para navegador */
  }

  if (!navigator.geolocation) return null

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = coordsFromPosition(pos)
        resolve(isAcceptableGpsReading(coords) ? coords : null)
      },
      () => resolve(null),
      GPS_OPTIONS,
    )
  })
}

/**
 * Refina GPS no instante da captura — aguarda leituras estáveis
 * e combina watcher + leitura avulsa de alta precisão.
 */
export async function capturePreciseCoordinates(
  watcher?: CoordsWatcher | null,
  maxWaitMs = 18_000,
): Promise<PhotoCoords | null> {
  const freshPromise = fetchOneShotPosition()
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    const stabilized = watcher?.getStabilized() ?? null
    if (stabilized && (stabilized.accuracy ?? 999) <= TARGET_ACCURACY_M) {
      return stabilized
    }
    if (stabilized && (stabilized.accuracy ?? 999) <= IDEAL_ACCURACY_M && (watcher?.sampleCount() ?? 0) >= 2) {
      return stabilized
    }
    await sleep(450)
  }

  const fresh = await freshPromise
  const stabilized = watcher?.getStabilized() ?? null
  const best = watcher?.getBest() ?? null

  const candidates = [stabilized, fresh, best].filter(isAcceptableGpsReading)
  if (candidates.length === 0) return null

  return candidates.reduce((a, b) => pickBetterCoords(a, b)!) 
}

/**
 * Monitora GPS continuamente e mantém sempre o fix de maior precisão
 * (menor valor de accuracy em metros).
 */
export function startCoordsWatcher(onUpdate?: (coords: PhotoCoords) => void): CoordsWatcher {
  let best: PhotoCoords | null = null
  let samples: GpsSample[] = []
  let stopped = false
  let watchId: string | number | undefined
  let nativeWatch = false

  const pruneSamples = () => {
    const now = Date.now()
    samples = samples
      .filter((s) => now - s.timestamp < MAX_SAMPLE_AGE_MS)
      .slice(-MAX_SAMPLES)
  }

  const getStabilized = () => stabilizeSamples(samples, best)

  const apply = (raw: PhotoCoords) => {
    if (!isAcceptableGpsReading(raw)) return

    pruneSamples()
    if (samples.length >= 2) {
      const ref = weightedCentroid(samples.slice(-4))
      const jump = distanceMeters(raw, ref)
      const maxJump = Math.max(20, (raw.accuracy ?? 25) * MAX_JUMP_FACTOR)
      if (jump > maxJump) return
    }

    samples.push({ ...raw, timestamp: Date.now() })
    best = pickBetterCoords(best, raw)
    const display = getStabilized() ?? best
    if (display) onUpdate?.(display)
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

  return {
    stop,
    getBest: () => (isAcceptableGpsReading(best) ? best : null),
    getStabilized,
    sampleCount: () => samples.length,
  }
}

/**
 * Aguarda o melhor fix possível dentro do tempo limite,
 * refinando a posição enquanto o GPS estabiliza.
 */
export function getBestCoordinates(maxWaitMs = 45_000): Promise<PhotoCoords | null> {
  return new Promise((resolve) => {
    let settled = false
    let watcher!: CoordsWatcher

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      void (async () => {
        const precise = await capturePreciseCoordinates(watcher, 8_000)
        watcher.stop()
        resolve(precise ?? watcher.getStabilized() ?? watcher.getBest())
      })()
    }

    watcher = startCoordsWatcher((coords) => {
      if ((coords.accuracy ?? 999) <= TARGET_ACCURACY_M && watcher.sampleCount() >= 2) {
        finish()
      }
    })

    const timer = setTimeout(finish, maxWaitMs)
  })
}

/** Obtém coordenadas GPS atuais (null se indisponível ou negado). */
export async function getCurrentCoordinates(): Promise<PhotoCoords | null> {
  return getBestCoordinates(45_000)
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
  const dataUrl = await fileToDataUrl(file)
  let coords = prefetchedCoords ? await prefetchedCoords : null
  if (!isAcceptableGpsReading(coords) || (coords.accuracy ?? 999) > IDEAL_ACCURACY_M) {
    coords = await capturePreciseCoordinates(null, 15_000)
  }
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
