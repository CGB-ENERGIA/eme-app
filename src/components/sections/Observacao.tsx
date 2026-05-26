import { MessageSquare } from 'lucide-react'
import type { FormularioEME } from '../../types/eme'
import SectionCard from '../ui/SectionCard'
import Field from '../ui/Field'

interface Props {
  form: FormularioEME
  onChange: (partial: Partial<FormularioEME>) => void
}

export default function Observacao({ form, onChange }: Props) {
  return (
    <SectionCard title="Informações Adicionais / Observação" icon={<MessageSquare size={16} />}>
      <Field
        as="textarea"
        label="Observação"
        rows={4}
        placeholder="Descreva informações adicionais relevantes ao atendimento..."
        value={form.observacao}
        onChange={(e) => onChange({ observacao: (e.target as HTMLTextAreaElement).value })}
      />
    </SectionCard>
  )
}
