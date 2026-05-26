import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldBase {
  label: string
  required?: boolean
  showError?: boolean
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

export default function Field(props: Props) {
  const { label, required, showError, as, ...rest } = props as FieldBase & { as?: 'input' | 'textarea' } & Record<string, unknown>

  const hasError = showError && required && !(rest as Record<string, unknown>).value
  const inputClass = `${baseClass} ${hasError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600'}`

  if (as === 'textarea') {
    const { rows, ...textareaRest } = rest as TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }
    return (
      <div className="flex flex-col gap-1">
        <label className={`text-xs font-medium uppercase tracking-wide ${hasError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <textarea className={`${inputClass} resize-none`} rows={rows ?? 3} {...textareaRest} />
        {hasError && <span className="text-xs text-red-500 font-medium">Campo obrigatório</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label className={`text-xs font-medium uppercase tracking-wide ${hasError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input className={inputClass} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      {hasError && <span className="text-xs text-red-500 font-medium">Campo obrigatório</span>}
    </div>
  )
}
