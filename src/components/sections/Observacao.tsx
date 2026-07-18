import { MessageSquare, ImageIcon } from 'lucide-react'
import type { FormularioEME } from '../../types/eme'
import SectionCard from '../ui/SectionCard'
import Field from '../ui/Field'
import PhotoCapture from '../ui/PhotoCapture'

interface Props {
  form: FormularioEME
  onChange: (partial: Partial<FormularioEME>) => void
  showErrors?: boolean
}

export default function Observacao({ form, onChange, showErrors }: Props) {
  return (
    <>
      <SectionCard title="Chegada na Base Pós Atendimento" icon={<ImageIcon size={16} />}>
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1 mb-2">
          Registre a chegada da equipe na base após a conclusão do serviço.
        </p>
        <PhotoCapture
          label="Chegada da equipe na base pós atendimento"
          value={form.fotoChegadaBasePosAtendimento}
          onChange={(v) => onChange({ fotoChegadaBasePosAtendimento: v })}
          incidente={form.incidente}
          equipe={form.equipe}
          required
          showError={showErrors}
        />
      </SectionCard>

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
    </>
  )
}
