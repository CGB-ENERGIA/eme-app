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
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
      <PhotoCapture
        label="1. Chegada da equipe na base"
        value={form.fotoChegadaBase}
        onChange={(v) => onChange({ fotoChegadaBase: v })}
        incidente={form.incidente}
        equipe={form.equipe}
        required
        showError={showErrors}
      />
      <PhotoCapture
        label="2. Saída da equipe da base"
        value={form.fotoSaidaBase}
        onChange={(v) => onChange({ fotoSaidaBase: v })}
        incidente={form.incidente}
        equipe={form.equipe}
        required
        showError={showErrors}
      />
      <PhotoCapture
        label="3. Chegada da equipe no local de serviço"
        value={form.fotoChegadaServico}
        onChange={(v) => onChange({ fotoChegadaServico: v })}
        incidente={form.incidente}
        equipe={form.equipe}
        required
        showError={showErrors}
      />
      </div>
    </SectionCard>
  )
}
