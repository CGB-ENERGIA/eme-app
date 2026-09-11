import { useState } from 'react'
import { X, Plus } from 'lucide-react'
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

/** Serializa/parseia a lista de equipes como string separada por vírgula —
 *  mantém compatibilidade com o campo `equipe: string` já usado no PDF,
 *  Excel, busca e Supabase, sem precisar migrar o schema. */
export function parseEquipes(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function joinEquipes(lista: string[]): string {
  return lista.join(', ')
}

export default function EquipeMultiSelect({
  value,
  base,
  onChange,
  required,
  showError,
  label = 'Equipe',
  id = 'equipe-select',
}: Props) {
  const [digitando, setDigitando] = useState('')
  const selecionadas = parseEquipes(value)
  const opcoesBase = equipesDaBase(base)
  const opcoes = opcoesBase.filter((eq) => !selecionadas.includes(eq))
  const hasError = Boolean(showError && required && selecionadas.length === 0)
  const listId = `${id}-sugestoes`

  const adicionar = (raw: string) => {
    const equipe = raw.trim().toUpperCase()
    if (!equipe || selecionadas.includes(equipe)) {
      setDigitando('')
      return
    }
    onChange(joinEquipes([...selecionadas, equipe]))
    setDigitando('')
  }

  const remover = (equipe: string) => {
    onChange(joinEquipes(selecionadas.filter((e) => e !== equipe)))
  }

  return (
    <div className="min-w-0 flex flex-col gap-1">
      <label
        htmlFor={id}
        className={`text-xs font-medium uppercase tracking-wide ${hasError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {selecionadas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-0.5">
          {selecionadas.map((eq) => (
            <span
              key={eq}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
              style={{ background: '#FFF0F4', color: '#9B003C', border: '1px solid rgba(192,1,74,0.25)' }}
            >
              {eq}
              <button
                type="button"
                onClick={() => remover(eq)}
                className="rounded-full p-0.5 hover:bg-black/10 transition"
                aria-label={`Remover ${eq}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <datalist id={listId}>
        {opcoes.map((eq) => (
          <option key={eq} value={eq} />
        ))}
      </datalist>

      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="text"
          list={listId}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={
            selecionadas.length > 0
              ? 'Adicionar outra equipe'
              : base?.trim() ? 'Digite ou selecione a equipe' : 'Selecione a base ou digite a equipe'
          }
          value={digitando}
          onChange={(e) => {
            const v = e.target.value.toUpperCase()
            // Ao tocar numa sugestão da datalist, o input já vem com o valor exato — adiciona na hora.
            if (opcoesBase.includes(v)) {
              adicionar(v)
              return
            }
            setDigitando(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              adicionar(digitando)
            }
          }}
          className={`${inputClass} flex-1 ${
            hasError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600'
          }`}
        />
        {digitando.trim() && (
          <button
            type="button"
            onClick={() => adicionar(digitando)}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-white transition active:scale-95"
            style={{ background: 'linear-gradient(135deg, #9B003C, #C0014A)' }}
            aria-label="Adicionar equipe"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {opcoes.length > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Sugestões de {base}: toque na lista ou digite livremente. Enter ou vírgula adiciona.
        </p>
      )}

      {hasError && <span className="text-xs text-red-500 font-medium">Selecione ao menos uma equipe</span>}
    </div>
  )
}
