import { FileImage, Plus, Trash2 } from 'lucide-react'
import type { FormularioEME, EvidenciaItem } from '../../types/eme'
import SectionCard from '../ui/SectionCard'
import PhotoCapture from '../ui/PhotoCapture'

interface Props {
  form: FormularioEME
  onChange: (partial: Partial<FormularioEME>) => void
  showErrors?: boolean
}

export default function Evidencias({ form, onChange, showErrors }: Props) {
  const atualizar = (idx: number, partial: Partial<EvidenciaItem>) => {
    const lista = form.evidencias.map((e, i) => (i === idx ? { ...e, ...partial } : e))
    onChange({ evidencias: lista })
  }

  const adicionar = () => {
    onChange({ evidencias: [...form.evidencias, { descricao: '', foto1: null, foto2: null }] })
  }

  const remover = (idx: number) => {
    onChange({ evidencias: form.evidencias.filter((_, i) => i !== idx) })
  }

  return (
    <SectionCard title="Evidências" icon={<FileImage size={16} />}>
      {form.evidencias.map((ev, idx) => (
        <div key={idx} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B003C' }}>
              Evidência {idx + 1}
            </span>
            {form.evidencias.length > 1 && (
              <button
                type="button"
                onClick={() => remover(idx)}
                className="text-slate-400 hover:text-red-500 transition"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PhotoCapture
              label="Foto do Defeito"
              value={ev.foto1}
              onChange={(v) => atualizar(idx, { foto1: v })}
              small
            />
            <PhotoCapture
              label="Foto da Correção"
              value={ev.foto2}
              onChange={(v) => atualizar(idx, { foto2: v })}
              small
            />
          </div>
        </div>
      ))}

      {/* Item fixo — Foto da Energização */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3 space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B003C' }}>
          Foto da Energização
        </span>
        <PhotoCapture
          label="Foto da Energização do Sistema"
          value={form.fotoEnergizacao ?? null}
          onChange={(v) => {
            onChange({ fotoEnergizacao: v })
            if (v) {
              setTimeout(() => {
                document.getElementById('secao-intervalo-energizacao')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 300)
            }
          }}
          required
          showError={showErrors}
        />
      </div>

      <button
        type="button"
        onClick={adicionar}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 text-sm font-medium transition"
        style={{ borderColor: '#F0C0CC', color: '#9B003C' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FFF0F4')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={16} />
        Adicionar evidência
      </button>
    </SectionCard>
  )
}
