import { FileImage, Plus, Trash2 } from 'lucide-react'
import type { FormularioEME, EvidenciaItem } from '../../types/eme'
import SectionCard from '../ui/SectionCard'
import PhotoCapture from '../ui/PhotoCapture'

/** Gera um par INSTALADO / RETIRADO para cada item base. */
const par = (base: string) => [`${base} INSTALADO`, `${base} RETIRADO`]

const _estruturas = [
  ...['U','D','N','B','T'].flatMap(l => [1,2,3,4].map(n => `ESTRUTURA - ${l}${n}`)),
  ...['S1A','S2A','S3A','S4A','S5A','S1D','S2D','S3D','S4D','S5D',
      'S1E','S2E','S3E','S4E','S5E','S1I','S3I','S4I','S4I°'].map(c => `ESTRUTURA - ${c}`),
]

const _cabos = ['1#35MM','2#35MM','3#35MM','4#35MM','70MM','4AWG','1/0','4/0'].map(c => `CABO ${c}`)

const SUGESTOES_FOTO: string[] = [
  'POSTE QUEBRADO',
  'POSTE DANIFICADO',
  'POSTE INSTALADO',
  'ESTAI DE SUBSOLO',
  'ESTAI ÂNCORA',
  'COMPONENTE INSTALADO', 'COMPONENTE RETIRADO',
  'CHAVE FUSIVEL',
  'TRAF MONOFÁSICO INSTALADO', 'TRAF MONOFÁSICO RETIRADO',
  'TRAF BIFÁSICO INSTALADO', 'TRAF BIFÁSICO RETIRADO',
  'TRAF TRIFÁSICO INSTALADO', 'TRAF TRIFÁSICO RETIRADO',
  'CHAVE FACA INSTALADA', 'CHAVE FACA RETIRADA',
  'BASTÕES INSTALADOS', 'BASTÕES RETIRADOS',
  'PLACA DO TRAF INSTALADO', 'PLACA DO TRAF RETIRADO',
  ..._cabos.flatMap(par),
  ..._estruturas.flatMap(par),
]

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
    onChange({ evidencias: [...form.evidencias, { descricao: '', descricao2: '', foto1: null, foto2: null }] })
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
              label={ev.descricao}
              onLabelChange={(v) => atualizar(idx, { descricao: v })}
              labelSuggestions={SUGESTOES_FOTO}
              value={ev.foto1}
              onChange={(v) => atualizar(idx, { foto1: v })}
              incidente={form.incidente}
              equipe={form.equipe}
              showError={showErrors}
              small
            />
            <PhotoCapture
              label={ev.descricao2}
              onLabelChange={(v) => atualizar(idx, { descricao2: v })}
              labelSuggestions={SUGESTOES_FOTO}
              value={ev.foto2}
              onChange={(v) => atualizar(idx, { foto2: v })}
              incidente={form.incidente}
              equipe={form.equipe}
              showError={showErrors}
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
          incidente={form.incidente}
          equipe={form.equipe}
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
