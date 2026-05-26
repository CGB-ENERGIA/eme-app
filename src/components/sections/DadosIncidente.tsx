import { MapPin } from 'lucide-react'
import type { FormularioEME } from '../../types/eme'
import SectionCard from '../ui/SectionCard'
import Field from '../ui/Field'

interface Props {
  form: FormularioEME
  onChange: (partial: Partial<FormularioEME>) => void
  showErrors?: boolean
}

export default function DadosIncidente({ form, onChange, showErrors }: Props) {
  return (
    <SectionCard title="Dados do Incidente" icon={<MapPin size={16} />}>
      <Field
        label="Incidente"
        required
        showError={showErrors}
        placeholder="Nº do incidente"
        inputMode="numeric"
        value={form.incidente}
        onChange={(e) => onChange({ incidente: e.target.value.replace(/\D/g, '') })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Base"
          required
          showError={showErrors}
          placeholder="Base operacional"
          value={form.base}
          onChange={(e) => onChange({ base: e.target.value })}
        />
        <Field
          label="Município"
          required
          showError={showErrors}
          placeholder="Município"
          value={form.municipio}
          onChange={(e) => onChange({ municipio: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Field
          label="Data Início"
          type="date"
          required
          showError={showErrors}
          value={form.dataInicio}
          onChange={(e) => onChange({ dataInicio: e.target.value })}
        />
        <Field
          label="Data Final"
          type="date"
          required
          showError={showErrors}
          value={form.dataFinal}
          onChange={(e) => onChange({ dataFinal: e.target.value })}
        />
        <Field
          label="Equipe"
          required
          showError={showErrors}
          placeholder="Prefixo da equipe"
          value={form.equipe}
          onChange={(e) => onChange({ equipe: e.target.value })}
        />
        <Field
          label="Supervisor"
          required
          showError={showErrors}
          placeholder="Nome do supervisor"
          value={form.supervisor}
          onChange={(e) => onChange({ supervisor: e.target.value })}
        />
      </div>
    </SectionCard>
  )
}
