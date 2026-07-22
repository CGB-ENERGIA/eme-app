import type { ChangeEvent, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldBase {
  label: string
  required?: boolean
  showError?: boolean
  /** Se false, não força maiúsculas (padrão: true em texto). */
  uppercase?: boolean
}

interface InputField extends FieldBase {
  as?: 'input'
}

interface TextareaField extends FieldBase {
  as: 'textarea'
}

type Props =
  | (InputField & InputHTMLAttributes<HTMLInputElement>)
  | (TextareaField & TextareaHTMLAttributes<HTMLTextAreaElement>)

const baseClass =
  'w-full rounded-xl border bg-slate-50 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition focus:ring-[#C0014A]'

const SKIP_UPPERCASE_TYPES = new Set([
  'date', 'time', 'datetime-local', 'month', 'week',
  'number', 'email', 'password', 'tel', 'url', 'file',
  'checkbox', 'radio', 'hidden', 'range', 'color',
])

function shouldForceUppercase(type: string | undefined, uppercaseProp: boolean | undefined) {
  if (uppercaseProp === false) return false
  if (uppercaseProp === true) return true
  return !SKIP_UPPERCASE_TYPES.has(type ?? 'text')
}

export default function Field(props: Props) {
  const { label, required, showError, as, uppercase, ...rest } = props as FieldBase & {
    as?: 'input' | 'textarea'
    uppercase?: boolean
  } & Record<string, unknown>

  const hasError = showError && required && !(rest as Record<string, unknown>).value
  const inputClass = `${baseClass} ${hasError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600'}`

  if (as === 'textarea') {
    const { rows, onChange, ...textareaRest } = rest as TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }
    const forceUpper = shouldForceUppercase('text', uppercase)

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (forceUpper) e.target.value = e.target.value.toUpperCase()
      onChange?.(e)
    }

    return (
      <div className="min-w-0 flex flex-col gap-1">
        <label className={`text-xs font-medium uppercase tracking-wide ${hasError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <textarea
          className={`${inputClass} resize-none ${forceUpper ? 'uppercase' : ''}`}
          rows={rows ?? 3}
          autoCapitalize={forceUpper ? 'characters' : undefined}
          onChange={handleChange}
          {...textareaRest}
        />
        {hasError && <span className="text-xs text-red-500 font-medium">Campo obrigatório</span>}
      </div>
    )
  }

  const { onChange, type, ...inputRest } = rest as InputHTMLAttributes<HTMLInputElement>
  const inputType = type ?? 'text'
  const forceUpper = shouldForceUppercase(inputType, uppercase)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (forceUpper) e.target.value = e.target.value.toUpperCase()
    onChange?.(e)
  }

  return (
    <div className="min-w-0 flex flex-col gap-1">
      <label className={`text-xs font-medium uppercase tracking-wide ${hasError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={inputType}
        className={`${inputClass} ${forceUpper ? 'uppercase' : ''}`}
        autoCapitalize={forceUpper ? 'characters' : undefined}
        onChange={handleChange}
        {...inputRest}
      />
      {hasError && <span className="text-xs text-red-500 font-medium">Campo obrigatório</span>}
    </div>
  )
}
