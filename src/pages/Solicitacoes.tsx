import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, ChevronRight, CheckCircle, Clock, Plus, Copy, Check, ExternalLink, Share2, X } from 'lucide-react'
import { criarFormularioVazio } from '../types/eme'
import type { FormularioEME } from '../types/eme'
import { salvarFormulario, listarFormularios, sincronizarDeSupabase } from '../store/db'
import AppShell from '../components/layout/AppShell'
import Field from '../components/ui/Field'
import SectionCard from '../components/ui/SectionCard'

export default function Solicitacoes() {
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [recentes, setRecentes] = useState<FormularioEME[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [linkGerado, setLinkGerado] = useState<{ url: string; form: FormularioEME } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [compartilhandoRecente, setCompartilhandoRecente] = useState<FormularioEME | null>(null)
  const [copiadoRecente, setCopiadoRecente] = useState(false)

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
    sincronizarDeSupabase()
      .then((merged) => { if (merged.length > 0) setRecentes(merged) })
      .catch(() => { /* silencioso — offline é OK */ })
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
    const url = `${window.location.origin}/formulario/${form.id}?step=1`
    setLinkGerado({ url, form })
    setEnviando(false)
    listarFormularios().then(setRecentes)
  }

  const copiarLink = async () => {
    if (!linkGerado) return
    await navigator.clipboard.writeText(linkGerado.url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const compartilhar = async (app: 'whatsapp' | 'telegram') => {
    if (!linkGerado) return
    const { form, url } = linkGerado
    const texto = `Formulário EME — Incidente ${form.incidente}\nEquipe: ${form.equipe}\nPreencha as fotos e evidências:\n${url}`
    const encoded = encodeURIComponent(texto)
    const href =
      app === 'whatsapp'
        ? `https://wa.me/?text=${encoded}`
        : `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Formulário EME — Incidente ${form.incidente} — Equipe: ${form.equipe}`)}`
    window.open(href, '_blank')
  }

  const urlDeFormulario = (form: FormularioEME) =>
    `${window.location.origin}/formulario/${form.id}?step=1`

  const copiarLinkRecente = async () => {
    if (!compartilhandoRecente) return
    await navigator.clipboard.writeText(urlDeFormulario(compartilhandoRecente))
    setCopiadoRecente(true)
    setTimeout(() => setCopiadoRecente(false), 2500)
  }

  const compartilharRecente = (app: 'whatsapp' | 'telegram') => {
    if (!compartilhandoRecente) return
    const f = compartilhandoRecente
    const url = urlDeFormulario(f)
    const texto = `Formulário EME — Incidente ${f.incidente}\nEquipe: ${f.equipe}\nPreencha as fotos e evidências:\n${url}`
    const encoded = encodeURIComponent(texto)
    const href =
      app === 'whatsapp'
        ? `https://wa.me/?text=${encoded}`
        : `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Formulário EME — Incidente ${f.incidente} — Equipe: ${f.equipe}`)}`
    window.open(href, '_blank')
  }

  const novasSolicitacao = () => {
    setLinkGerado(null)
    setShowErrors(false)
    setDados({ incidente: '', base: '', municipio: '', dataInicio: '', dataFinal: '', equipe: '', supervisor: '' })
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

        {/* Estado: link gerado */}
        {linkGerado ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
            {/* Cabeçalho verde */}
            <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
              <div className="bg-white/20 rounded-xl p-2">
                <CheckCircle size={22} className="text-white" />
              </div>
              <div>
                <p className="text-white font-black text-base">Solicitação criada!</p>
                <p className="text-green-100 text-sm">Incidente {linkGerado.form.incidente} · {linkGerado.form.equipe}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Envie o link abaixo para a equipe de campo preencher as fotos e evidências:
              </p>

              {/* Link */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-600">
                <p className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-300 truncate">{linkGerado.url}</p>
                <button
                  onClick={copiarLink}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: copiado ? '#16a34a' : '#C0014A', color: 'white' }}
                >
                  {copiado ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                </button>
              </div>

              {/* Botões de compartilhamento */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => compartilhar('whatsapp')}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => compartilhar('telegram')}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #0077B5, #2AABEE)', boxShadow: '0 4px 12px rgba(42,171,238,0.3)' }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </button>
              </div>

              {/* Ações secundárias */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => navigate(`/formulario/${linkGerado.form.id}?step=1`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <ExternalLink size={14} /> Abrir formulário
                </button>
                <button
                  onClick={novasSolicitacao}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold text-white transition active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #9B003C, #C0014A)' }}
                >
                  <Plus size={14} /> Nova solicitação
                </button>
              </div>
            </div>
          </div>
        ) : (

        /* Formulário de nova solicitação */
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
        )}

        {/* Lista de formulários recentes */}
        {recentes.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
              Formulários recentes
            </p>
            <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {recentes.slice(0, 6).map((f) => (
                <div
                  key={f.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl flex items-center gap-0 overflow-hidden"
                  style={{ border: '1px solid', borderColor: 'rgb(226 232 240 / 0.8)' }}
                >
                  {/* Área clicável principal */}
                  <button
                    onClick={() => navigate(`/formulario/${f.id}`)}
                    className="flex-1 text-left px-4 py-3 flex items-center gap-3 transition hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-[0.99] min-w-0"
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

                  {/* Botão compartilhar link */}
                  <button
                    onClick={() => { setCopiadoRecente(false); setCompartilhandoRecente(f) }}
                    className="flex-shrink-0 flex items-center justify-center w-11 h-full border-l border-slate-100 dark:border-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-95"
                    title="Compartilhar link do formulário"
                    style={{ color: '#9B003C' }}
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: link de formulário recente */}
        {compartilhandoRecente && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-4"
            onClick={() => setCompartilhandoRecente(null)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-800 dark:text-slate-100 text-base">
                    Incidente {compartilhandoRecente.incidente || '—'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {compartilhandoRecente.equipe}
                    {compartilhandoRecente.equipe && compartilhandoRecente.dataInicio ? ' · ' : ''}
                    {formatarDataServico(compartilhandoRecente.dataInicio)}
                  </p>
                </div>
                <button
                  onClick={() => setCompartilhandoRecente(null)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Link */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-600">
                <p className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                  {urlDeFormulario(compartilhandoRecente)}
                </p>
                <button
                  onClick={copiarLinkRecente}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: copiadoRecente ? '#16a34a' : '#C0014A', color: 'white' }}
                >
                  {copiadoRecente ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                </button>
              </div>

              {/* WhatsApp / Telegram */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => compartilharRecente('whatsapp')}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => compartilharRecente('telegram')}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #0077B5, #2AABEE)', boxShadow: '0 4px 12px rgba(42,171,238,0.3)' }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </button>
              </div>

              <button
                onClick={() => navigate(`/formulario/${compartilhandoRecente.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <ExternalLink size={14} /> Abrir formulário
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
