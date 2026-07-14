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
        <>
          <datalist id="municipios-ma">
            <option value="AÇAILÂNDIA" />
            <option value="ALTO ALEGRE DO MARANHÃO" />
            <option value="ARARI" />
            <option value="BACABAL" />
            <option value="BALSAS" />
            <option value="BARRA DO CORDA" />
            <option value="BREJO" />
            <option value="BURITI" />
            <option value="CAXIAS" />
            <option value="CHAPADINHA" />
            <option value="CODÓ" />
            <option value="COROATÁ" />
            <option value="ESPERANTINÓPOLIS" />
            <option value="GRAJAÚ" />
            <option value="IMPERATRIZ" />
            <option value="ITAPECURU MIRIM" />
            <option value="JOÃO LISBOA" />
            <option value="LAGO DA PEDRA" />
            <option value="LAGO DO JUNCO" />
            <option value="MATÕES" />
            <option value="MIRADOR" />
            <option value="OLHO D'ÁGUA DAS CUNHÃS" />
            <option value="PARAIBANO" />
            <option value="PARNARAMA" />
            <option value="PEDREIRAS" />
            <option value="PERITORÓ" />
            <option value="PRESIDENTE DUTRA" />
            <option value="SANTA INÊS" />
            <option value="SÃO JOÃO DOS PATOS" />
            <option value="SÃO LUÍS" />
            <option value="SÃO MATEUS DO MARANHÃO" />
            <option value="TIMBIRAS" />
            <option value="TIMON" />
            <option value="VITORINO FREIRE" />
          </datalist>
          <Field
            label="Município"
            required
            showError={showErrors}
            placeholder="Município"
            list="municipios-ma"
            value={form.municipio}
            onChange={(e) => onChange({ municipio: e.target.value.toUpperCase() })}
          />
        </>
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
