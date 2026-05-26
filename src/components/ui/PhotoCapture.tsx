import { useRef, useState } from 'react'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { processCameraPhoto, processGalleryPhoto, getCurrentCoordinates, type PhotoCoords } from '../../utils/stampImage'

interface Props {
  label: string
  value: string | null
  onChange: (base64: string | null) => void
  small?: boolean
  required?: boolean
  showError?: boolean
  hint?: string
}

export default function PhotoCapture({ label, value, onChange, small, required, showError, hint }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const geoPrefetch = useRef<Promise<PhotoCoords | null> | null>(null)
  const [processing, setProcessing] = useState(false)

  const openCamera = () => {
    geoPrefetch.current = getCurrentCoordinates()
    cameraRef.current?.click()
  }

  const handleFile = async (file: File | null, fromCamera: boolean) => {
    if (!file) return
    setProcessing(true)
    try {
      const result = fromCamera
        ? await processCameraPhoto(file, geoPrefetch.current ?? undefined)
        : await processGalleryPhoto(file)
      onChange(result)
    } catch {
      onChange(null)
    } finally {
      geoPrefetch.current = null
      setProcessing(false)
      if (fromCamera && cameraRef.current) cameraRef.current.value = ''
      if (!fromCamera && fileRef.current) fileRef.current.value = ''
    }
  }

  const hasError = showError && required && !value

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide flex items-center gap-1"
          style={{ color: hasError ? '#ef4444' : '#64748b' }}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
        {hint && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#FFF0F4', color: '#9B003C' }}>
            {hint}
          </span>
        )}
      </div>

      {value ? (
        <div className={`relative rounded-xl overflow-hidden border bg-slate-50 dark:bg-slate-700 ${small ? 'h-32 lg:h-36' : 'h-44 lg:h-52'} ${hasError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 ${small ? 'h-32 lg:h-36' : 'h-44 lg:h-52'} ${
          hasError
            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
        }`}>
          {processing ? (
            <>
              <Loader2 size={28} className="animate-spin" style={{ color: '#C0014A' }} />
              <span className="text-xs font-medium text-slate-500">Processando foto...</span>
            </>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex flex-col items-center gap-1 transition"
                  style={{ color: '#9B003C' }}
                >
                  <div className="rounded-xl p-2.5" style={{ background: '#FFF0F4' }}>
                    <Camera size={20} />
                  </div>
                  <span className="text-xs font-medium">Câmera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                >
                  <div className="bg-slate-100 dark:bg-slate-600 rounded-xl p-2.5">
                    <Upload size={20} />
                  </div>
                  <span className="text-xs font-medium">Galeria</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Câmera inclui data/hora e GPS automaticamente
              </span>
            </>
          )}
          {hasError && !processing && (
            <span className="text-xs text-red-500 font-medium">Foto obrigatória</span>
          )}
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null, true)} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null, false)} />
    </div>
  )
}
