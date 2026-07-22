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

const selectClass =
  'w-full rounded-xl border bg-slate-50 dark:bg-slate-700 dark:text-slate-100 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition focus:ring-[#C0014A] appearance-none'

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
  const semBase = !base?.trim()
  const semCadastro = Boolean(base?.trim()) && opcoes.length === 0

  return (
    <div className="min-w-0 flex flex-col gap-1">
      <label
        htmlFor={id}
        className={`text-xs font-medium uppercase tracking-wide ${hasError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="relative min-w-0">
        <select
          id={id}
          value={value}
          disabled={semBase || semCadastro}
          onChange={(e) => onChange(e.target.value)}
          className={`${selectClass} pr-9 ${
            hasError
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
              : 'border-slate-200 dark:border-slate-600'
          } ${semBase || semCadastro ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <option value="">
            {semBase
              ? 'Selecione a base primeiro'
              : semCadastro
                ? 'Sem equipes cadastradas nesta base'
                : 'Selecione a equipe'}
          </option>
          {opcoes.map((eq) => (
            <option key={eq} value={eq}>
              {eq}
            </option>
          ))}
          {/* Mantém valor atual se veio de fora da lista (dados antigos) */}
          {value && !opcoes.includes(value) && (
            <option value={value}>{value}</option>
          )}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
          aria-hidden
        >
          ▼
        </span>
      </div>

      {!semBase && opcoes.length > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Sugestões de {base}: {opcoes.length} equipe{opcoes.length !== 1 ? 's' : ''}
        </p>
      )}

      {hasError && <span className="text-xs text-red-500 font-medium">Campo obrigatório</span>}
    </div>
  )
}
