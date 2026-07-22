import { equipesDaBase } from '../../data/equipes'

interface Props {
  value: string
  base?: string
  onChange: (equipe: string) => void
  required?: boolean
  showError?: boolean
  label?: string
  id?: string
}

const inputClass =
  'w-full rounded-xl border bg-slate-50 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition focus:ring-[#C0014A] uppercase'

export default function EquipeSelect({
  value,
  base,
  onChange,
  required,
  showError,
  label = 'Equipe',
  id = 'equipe-select',
}: Props) {
  const opcoes = equipesDaBase(base)
  const hasError = Boolean(showError && required && !value)
  const listId = `${id}-sugestoes`

  return (
    <div className="min-w-0 flex flex-col gap-1">
      <label
        htmlFor={id}
        className={`text-xs font-medium uppercase tracking-wide ${hasError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <datalist id={listId}>
        {opcoes.map((eq) => (
          <option key={eq} value={eq} />
        ))}
      </datalist>

      <input
        id={id}
        type="text"
        list={listId}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder={base?.trim() ? 'Digite ou selecione a equipe' : 'Selecione a base ou digite a equipe'}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className={`${inputClass} ${
          hasError
            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
            : 'border-slate-200 dark:border-slate-600'
        }`}
      />

      {opcoes.length > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Sugestões de {base}: toque na lista ou digite livremente
        </p>
      )}

      {hasError && <span className="text-xs text-red-500 font-medium">Campo obrigatório</span>}
    </div>
  )
}
