import { ImageIcon } from 'lucide-react'
import type { FormularioEME } from '../../types/eme'
import SectionCard from '../ui/SectionCard'
import PhotoCapture from '../ui/PhotoCapture'

interface Props {
  form: FormularioEME
  onChange: (partial: Partial<FormularioEME>) => void
  showErrors?: boolean
}

export default function FotosServico({ form, onChange, showErrors }: Props) {
  return (
    <SectionCard title="Fotos do Serviço" icon={<ImageIcon size={16} />}>
      <PhotoCapture
        label="1. Chegada da equipe na base"
        value={form.fotoChegadaBase}
        onChange={(v) => onChange({ fotoChegadaBase: v })}
        required
        showError={showErrors}
      />
      <PhotoCapture
        label="2. Chegada da equipe no local de serviço"
        value={form.fotoChegadaServico}
        onChange={(v) => onChange({ fotoChegadaServico: v })}
        required
        showError={showErrors}
      />
    </SectionCard>
  )
}
