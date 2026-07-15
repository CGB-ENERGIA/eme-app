import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, ChevronRight, CheckCircle, Clock, Plus } from 'lucide-react'
import { criarFormularioVazio } from '../types/eme'
import type { FormularioEME } from '../types/eme'
import { salvarFormulario, listarFormularios } from '../store/db'
import AppShell from '../components/layout/AppShell'
import Field from '../components/ui/Field'
import SectionCard from '../components/ui/SectionCard'

export default function Solicitacoes() {
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [recentes, setRecentes] = useState<FormularioEME[]>([])
  const [showErrors, setShowErrors] = useState(false)

  const [dados, setDados] = useState({
    incidente: '',
    base: '',
    municipio: '',
    dataInicio: '',
    dataFinal: '',
    equipe: '',
    supervisor: '',
  })

  useEffect(() => {
    listarFormularios().then(setRecentes)
  }, [])

  const valido =
    dados.incidente &&
    dados.base &&
    dados.municipio &&
    dados.dataInicio &&
    dados.dataFinal &&
    dados.equipe &&
    dados.supervisor

  const criar = async () => {
    if (!valido) { setShowErrors(true); return }
    setEnviando(true)
    const form: FormularioEME = {
      ...criarFormularioVazio(),
      incidente: dados.incidente,
      base: dados.base,
      municipio: dados.municipio,
      dataInicio: dados.dataInicio,
      dataFinal: dados.dataFinal,
      equipe: dados.equipe,
      supervisor: dados.supervisor,
    }
    await salvarFormulario(form)
    navigate(`/formulario/${form.id}?step=1`)
  }

  const formatarDataServico = (d: string) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <AppShell page="solicitacoes">
      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden px-4 pt-14 pb-8 lg:pt-8 lg:pb-10 lg:px-8"
        style={{ background: 'linear-gradient(135deg, #6B0028 0%, #9B003C 45%, #C0014A 100%)' }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rotate-45 rounded-3xl bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rotate-45 rounded-2xl bg-white/5" />
        <div className="relative max-w-lg mx-auto lg:max-w-4xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 rounded-2xl p-2.5">
              <ClipboardList size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-2xl lg:text-3xl leading-tight">Solicitações</h1>
              <p className="text-pink-200 text-sm">Abertura de atendimento emergencial</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="max-w-lg mx-auto lg:max-w-4xl px-4 lg:px-8 py-6 pb-24 lg:pb-10 space-y-6">

        {/* Formulário de nova solicitação */}
        <SectionCard title="Nova Solicitação" icon={<Plus size={16} />}>
          <Field
            label="Incidente"
            required
            showError={showErrors}
            placeholder="Nº do incidente"
            inputMode="numeric"
            value={dados.incidente}
            onChange={(e) => setDados(p => ({ ...p, incidente: e.target.value.replace(/\D/g, '') }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Base"
              required
              showError={showErrors}
              placeholder="Base operacional"
              value={dados.base}
              onChange={(e) => setDados(p => ({ ...p, base: e.target.value }))}
            />
            <>
              <datalist id="municipios-sol">
                <option value="AÇAILÂNDIA" /><option value="ALTO ALEGRE DO MARANHÃO" />
                <option value="ARARI" /><option value="BACABAL" /><option value="BALSAS" />
                <option value="BARRA DO CORDA" /><option value="BREJO" /><option value="BURITI" />
                <option value="CAXIAS" /><option value="CHAPADINHA" /><option value="CODÓ" />
                <option value="COROATÁ" /><option value="ESPERANTINÓPOLIS" /><option value="GRAJAÚ" />
                <option value="IMPERATRIZ" /><option value="ITAPECURU MIRIM" /><option value="JOÃO LISBOA" />
                <option value="LAGO DA PEDRA" /><option value="LAGO DO JUNCO" /><option value="MATÕES" />
                <option value="MIRADOR" /><option value="OLHO D'ÁGUA DAS CUNHÃS" />
                <option value="PARAIBANO" /><option value="PARNARAMA" /><option value="PEDREIRAS" />
                <option value="PERITORÓ" /><option value="PRESIDENTE DUTRA" /><option value="SANTA INÊS" />
                <option value="SÃO JOÃO DOS PATOS" /><option value="SÃO LUÍS" />
                <option value="SÃO MATEUS DO MARANHÃO" /><option value="TIMBIRAS" />
                <option value="TIMON" /><option value="VITORINO FREIRE" />
              </datalist>
              <Field
                label="Município"
                required
                showError={showErrors}
                placeholder="Município"
                list="municipios-sol"
                value={dados.municipio}
                onChange={(e) => setDados(p => ({ ...p, municipio: e.target.value.toUpperCase() }))}
              />
            </>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Field
              label="Data Início"
              type="date"
              required
              showError={showErrors}
              value={dados.dataInicio}
              onChange={(e) => setDados(p => ({ ...p, dataInicio: e.target.value }))}
            />
            <Field
              label="Data Final"
              type="date"
              required
              showError={showErrors}
              value={dados.dataFinal}
              onChange={(e) => setDados(p => ({ ...p, dataFinal: e.target.value }))}
            />
            <Field
              label="Equipe"
              required
              showError={showErrors}
              placeholder="Prefixo da equipe"
              value={dados.equipe}
              onChange={(e) => setDados(p => ({ ...p, equipe: e.target.value }))}
            />
            <Field
              label="Supervisor"
              required
              showError={showErrors}
              placeholder="Nome do supervisor"
              value={dados.supervisor}
              onChange={(e) => setDados(p => ({ ...p, supervisor: e.target.value }))}
            />
          </div>

          <button
            onClick={criar}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 hover:brightness-110 disabled:opacity-60 mt-2"
            style={{ background: 'linear-gradient(135deg, #9B003C, #C0014A)', boxShadow: '0 8px 24px rgba(160,0,60,0.35)' }}
          >
            {enviando ? 'Criando...' : 'Criar Formulário →'}
          </button>
        </SectionCard>

        {/* Lista de formulários recentes */}
        {recentes.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
              Formulários recentes
            </p>
            <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {recentes.slice(0, 6).map((f) => (
                <button
                  key={f.id}
                  onClick={() => navigate(`/formulario/${f.id}`)}
                  className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3 transition hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-[0.99]"
                  style={{ border: '1px solid', borderColor: 'rgb(226 232 240 / 0.8)' }}
                >
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    f.status === 'finalizado'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    {f.status === 'finalizado'
                      ? <CheckCircle size={14} className="text-emerald-600" />
                      : <Clock size={14} className="text-amber-600" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 dark:text-slate-100 text-sm truncate">
                      {f.incidente || 'Sem identificação'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {f.equipe && <span>{f.equipe}</span>}
                      {f.equipe && f.dataInicio && <span> · </span>}
                      {f.dataInicio && <span>{formatarDataServico(f.dataInicio)}</span>}
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
