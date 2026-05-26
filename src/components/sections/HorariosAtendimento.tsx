import { Clock, Plus, Trash2 } from 'lucide-react'
import type { FormularioEME, HorarioAtendimento } from '../../types/eme'
import SectionCard from '../ui/SectionCard'
import Field from '../ui/Field'

interface Props {
  form: FormularioEME
  onChange: (partial: Partial<FormularioEME>) => void
}

export default function HorariosAtendimento({ form, onChange }: Props) {
  const atualizar = (idx: number, partial: Partial<HorarioAtendimento>) => {
    const lista = form.horariosAtendimento.map((h, i) => (i === idx ? { ...h, ...partial } : h))
    onChange({ horariosAtendimento: lista })
  }

  const adicionar = () => {
    onChange({
      horariosAtendimento: [
        ...form.horariosAtendimento,
        { id: crypto.randomUUID(), descricao: '', horaInicio: '', horaFim: '' },
      ],
    })
  }

  const remover = (idx: number) => {
    onChange({ horariosAtendimento: form.horariosAtendimento.filter((_, i) => i !== idx) })
  }

  return (
    <SectionCard title="Horários de Atendimento" icon={<Clock size={16} />}>
      {form.horariosAtendimento.map((h, idx) => (
        <div key={h.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Período {idx + 1}</span>
            {form.horariosAtendimento.length > 1 && (
              <button
                type="button"
                onClick={() => remover(idx)}
                className="text-red-400 hover:text-red-600 transition"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <Field
            label="Descrição"
            placeholder="Ex: Deslocamento, Execução..."
            value={h.descricao}
            onChange={(e) => atualizar(idx, { descricao: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Início"
              type="time"
              value={h.horaInicio}
              onChange={(e) => atualizar(idx, { horaInicio: e.target.value })}
            />
            <Field
              label="Fim"
              type="time"
              value={h.horaFim}
              onChange={(e) => atualizar(idx, { horaFim: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={adicionar}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 py-2.5 text-sm font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition"
      >
        <Plus size={16} />
        Adicionar período
      </button>

      <div className="border-t border-slate-100 pt-3 space-y-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-blue-600"
              checked={form.houveIntervalo}
              onChange={(e) => onChange({ houveIntervalo: e.target.checked })}
            />
            <span className="text-sm font-medium text-slate-700">Houve intervalo?</span>
          </label>
        </div>
        <Field
          label="Hora de Energização do Sistema"
          type="time"
          value={form.horaEnergizacao}
          onChange={(e) => onChange({ horaEnergizacao: e.target.value })}
        />
      </div>
    </SectionCard>
  )
}
