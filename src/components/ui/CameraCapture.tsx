import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2, SwitchCamera } from 'lucide-react'
import {
  capturePreciseCoordinates,
  captureVideoFrame,
  describeGpsStatus,
  getStampLines,
  isCameraSupported,
  processCameraPhoto,
  startCoordsWatcher,
  type CoordsWatcher,
  type PhotoCoords,
  type PhotoStampContext,
} from '../../utils/stampImage'

interface Props {
  open: boolean
  onClose: () => void
  onCapture: (dataUrl: string) => void
  incidente?: string
  equipe?: string
  onFallback?: () => void
}

export default function CameraCapture({
  open,
  onClose,
  onCapture,
  incidente,
  equipe,
  onFallback,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const geoWatchRef = useRef<CoordsWatcher | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [coords, setCoords] = useState<PhotoCoords | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [gpsMessage, setGpsMessage] = useState('Calibrando GPS...')
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    stopStream()
    setLoading(true)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
    } catch {
      setError('Não foi possível acessar a câmera.')
    } finally {
      setLoading(false)
    }
  }, [stopStream])

  useEffect(() => {
    if (!open) return

    if (!isCameraSupported()) {
      onClose()
      onFallback?.()
      return
    }

    geoWatchRef.current?.stop()
    setCoords(null)
    geoWatchRef.current = startCoordsWatcher((c) => {
      setCoords(c)
      setGpsMessage(describeGpsStatus(c).message)
    })
    startCamera(facing)

    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => {
      clearInterval(clock)
      geoWatchRef.current?.stop()
      geoWatchRef.current = null
      stopStream()
    }
  }, [open, facing, startCamera, stopStream, onClose, onFallback])

  const gpsStatus = describeGpsStatus(coords)
  const overlayLines = getStampLines({ capturedAt: now, coords, incidente, equipe })

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    setCapturing(true)
    setGpsMessage('Refinando GPS para captura...')
    try {
      const finalCoords = await capturePreciseCoordinates(geoWatchRef.current, 18_000)
      const result = await captureVideoFrame(video, {
        capturedAt: new Date(),
        coords: finalCoords ?? coords,
        incidente,
        equipe,
      })
      stopStream()
      onCapture(result)
      onClose()
    } catch {
      setError('Erro ao capturar foto.')
    } finally {
      setCapturing(false)
    }
  }

  const handleClose = () => {
    stopStream()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white safe-top">
        <button type="button" onClick={handleClose} className="p-2 rounded-xl bg-white/10">
          <X size={22} />
        </button>
        <span className="text-sm font-semibold">Câmera EME</span>
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded-full max-w-[45%] truncate"
          style={{
            background:
              gpsStatus.quality === 'excellent' || gpsStatus.quality === 'good'
                ? 'rgba(34,197,94,0.25)'
                : gpsStatus.quality === 'fair'
                  ? 'rgba(234,179,8,0.25)'
                  : 'rgba(255,255,255,0.12)',
          }}
          title={gpsMessage}
        >
          {capturing ? 'Refinando GPS...' : gpsMessage}
        </span>
        <button
          type="button"
          onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')}
          className="p-2 rounded-xl bg-white/10"
          title="Trocar câmera"
        >
          <SwitchCamera size={22} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 size={36} className="animate-spin text-white" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center z-10">
            <p className="text-white text-sm">{error}</p>
            <button type="button" onClick={() => startCamera(facing)} className="px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-semibold">
              Tentar novamente
            </button>
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

        {!loading && !error && (
          <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pointer-events-none">
            <div className="w-full px-3 py-2.5 space-y-1">
              {overlayLines.map((line, i) => (
                <p
                  key={i}
                  className={`text-white font-bold leading-snug break-words ${line.coords ? 'font-mono tracking-wide' : ''}`}
                  style={{
                    fontSize: line.large
                      ? 'clamp(15px, 4.6vw, 23px)'
                      : 'clamp(16px, 5.2vw, 26px)',
                    textShadow:
                      '0 2px 8px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85), 1px 2px 3px rgba(0,0,0,1), -1px -1px 2px rgba(0,0,0,0.9)',
                  }}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center py-6 bg-black safe-bottom">
        <button
          type="button"
          onClick={handleCapture}
          disabled={loading || !!error || capturing}
          className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          style={{ background: '#C0014A' }}
        >
          {capturing
            ? <Loader2 size={28} className="animate-spin text-white" />
            : <Camera size={30} className="text-white" />}
        </button>
      </div>
    </div>
  )
}

export async function captureViaNativeInput(
  file: File,
  coordsPromise: Promise<PhotoCoords | null> | undefined,
  context?: PhotoStampContext,
): Promise<string> {
  return processCameraPhoto(file, coordsPromise, context)
}
