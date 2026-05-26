import { useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  error?: boolean
}

function pad(n: number) { return String(n).padStart(2, '0') }
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)) }

export default function TimeInput({ value, onChange, error }: Props) {
  const [hStr, mStr] = value ? value.split(':') : ['', '']
  const h = parseInt(hStr) || 0
  const m = parseInt(mStr) || 0

  const hRef = useRef<HTMLInputElement>(null)
  const mRef = useRef<HTMLInputElement>(null)

  // Sincroniza valor exibido apenas quando o input não está focado
  useEffect(() => {
    if (hRef.current && document.activeElement !== hRef.current) {
      hRef.current.value = value ? pad(h) : ''
    }
    if (mRef.current && document.activeElement !== mRef.current) {
      mRef.current.value = value ? pad(m) : ''
    }
  }, [value, h, m])

  const commitH = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    const num = clamp(parseInt(digits) || 0, 0, 23)
    onChange(`${pad(num)}:${pad(m)}`)
    return num
  }

  const commitM = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    const num = clamp(parseInt(digits) || 0, 0, 59)
    onChange(`${pad(h)}:${pad(num)}`)
    return num
  }

  const setH = (val: number) => onChange(`${pad((val + 24) % 24)}:${pad(m)}`)
  const setM = (val: number) => onChange(`${pad(h)}:${pad((val + 60) % 60)}`)

  const handleHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    e.target.value = raw
    if (raw.length === 2) {
      commitH(raw)
      mRef.current?.focus()
      mRef.current?.select()
    }
  }

  const handleMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    e.target.value = raw
    if (raw.length === 2) {
      commitM(raw)
      mRef.current?.blur()
    }
  }

  const spinClass = "flex items-center justify-center rounded-xl w-10 h-10 transition active:scale-95 select-none cursor-pointer"
  const borderColor = error
    ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
    : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
  const inputClass = "text-3xl font-black text-slate-800 dark:text-slate-100 leading-none w-14 text-center tabular-nums bg-transparent border-none outline-none caret-pink-600 focus:bg-slate-200 dark:focus:bg-slate-600 rounded-lg transition"

  return (
    <div className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 ${borderColor}`}>
      {/* HORAS */}
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => setH(h + 1)}
          className={`${spinClass} bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300`}>
          <ChevronUp size={18} />
        </button>
        <div className="flex flex-col items-center">
          <input
            ref={hRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            defaultValue={value ? pad(h) : ''}
            placeholder="--"
            onChange={handleHChange}
            onBlur={(e) => { commitH(e.target.value); e.target.value = pad(clamp(parseInt(e.target.value) || 0, 0, 23)) }}
            onFocus={(e) => { e.target.value = ''; }}
            className={inputClass}
          />
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">hora</span>
        </div>
        <button type="button" onClick={() => setH(h - 1)}
          className={`${spinClass} bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300`}>
          <ChevronDown size={18} />
        </button>
      </div>

      {/* Separador */}
      <span className="text-3xl font-black text-slate-300 dark:text-slate-600 mb-4">:</span>

      {/* MINUTOS */}
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => setM(m + 1)}
          className={`${spinClass} bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300`}>
          <ChevronUp size={18} />
        </button>
        <div className="flex flex-col items-center">
          <input
            ref={mRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            defaultValue={value ? pad(m) : ''}
            placeholder="--"
            onChange={handleMChange}
            onBlur={(e) => { commitM(e.target.value); e.target.value = pad(clamp(parseInt(e.target.value) || 0, 0, 59)) }}
            onFocus={(e) => { e.target.value = ''; }}
            className={inputClass}
          />
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">min</span>
        </div>
        <button type="button" onClick={() => setM(m - 1)}
          className={`${spinClass} bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300`}>
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  )
}
