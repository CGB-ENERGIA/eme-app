import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Trash2, CheckCircle, Clock, ChevronRight, FileDown, Loader2, Sun, Moon, Zap, Search, X, Share2, Copy, Check, Link, Pencil, RefreshCw } from 'lucide-react'
import { listarFormularios, excluirFormulario, sincronizarDeSupabase, sincronizarTudo } from '../store/db'
import type { FormularioEME } from '../types/eme'
import { criarFormularioVazio } from '../types/eme'
import { salvarFormulario } from '../store/db'
import { useTheme } from '../contexts/ThemeContext'
import AppShell from '../components/layout/AppShell'
import { useAppRole } from '../contexts/RoleContext'
import LogoCGB from '../components/ui/LogoCGB'
import { logError } from '../utils/telemetry'

export default function Lista() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { isSolicitante } = useAppRole()
  const [formularios, setFormularios] = useState<FormularioEME[]>([])
  const [carregando, setCarregando] = useState(true)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [exportandoPDF, setExportandoPDF] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [baseAtiva, setBaseAtiva] = useState<string | null>(null)
  const [compartilhando, setCompartilhando] = useState<string | null>(null)
  const [gerandoShare, setGerandoShare] = useState(false)
  const [copiadoLink, setCopiadoLink] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const urlDeFormulario = (id: string) => `${window.location.origin}/formulario/${id}?step=1&campo=1`

  const copiarLink = async (id: string) => {
    await navigator.clipboard.writeText(urlDeFormulario(id))
    setCopiadoLink(true)
    setTimeout(() => setCopiadoLink(false), 2500)
  }

  const compartilharLink = (form: FormularioEME, app: 'whatsapp' | 'telegram') => {
    const url = urlDeFormulario(form.id)
    const texto = `Formulário EME — Incidente ${form.incidente}\nEquipe: ${form.equipe}\nPreencha as fotos e evidências:\n${url}`
    const href =
      app === 'whatsapp'
        ? `https://wa.me/?text=${encodeURIComponent(texto)}`
        : `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Formulário EME — Incidente ${form.incidente} — Equipe: ${form.equipe}`)}`
    window.open(href, '_blank')
  }

  const carregar = async () => {
    setCarregando(true)
    const lista = await listarFormularios()
    setFormularios(lista)
    setCarregando(false)

    // Sync em background: puxa do Supabase e atualiza a lista se houver novidades
    sincronizarDeSupabase()
      .then((merged) => { if (merged.length > 0) setFormularios(merged) })
      .catch(() => { /* silencioso — offline é OK */ })
  }

  const sincronizar = async () => {
    if (sincronizando) return
    setSincronizando(true)
    setSyncMsg(null)
    try {
      const result = await sincronizarTudo()
      const lista = await listarFormularios()
      setFormularios(lista)
      setSyncMsg(
        result.ok
          ? (result.enviados > 0
            ? `Sincronizado: ${result.enviados} envio(s).`
            : `Atualizado: ${result.total} formulário(s).`)
          : (result.erro ?? 'Falha na sincronização.'),
      )
    } catch {
      setSyncMsg('Falha na sincronização. Tente novamente.')
    } finally {
      setSincronizando(false)
      window.setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  useEffect(() => { carregar() }, [])

  const novoFormulario = async () => {
    const form = criarFormularioVazio()
    await salvarFormulario(form)
    navigate(`/formulario/${form.id}`)
  }

  const excluir = async (id: string) => {
    await excluirFormulario(id)
    setExcluindo(null)
    carregar()
  }

  const gerarPDF = async (e: React.MouseEvent, form: FormularioEME) => {
    e.stopPropagation()
    setExportandoPDF(form.id)
    try {
      const { exportarPDF } = await import('../utils/exportPDF')
      await exportarPDF(form)
    } catch (error) {
      logError(error, { scope: 'lista', action: 'exportar-pdf', formId: form.id })
    } finally {
      setExportandoPDF(null)
    }
  }

  const compartilharPDF = async (form: FormularioEME) => {
    setGerandoShare(true)
    try {
      const { exportarPDF } = await import('../utils/exportPDF')
      const result = await exportarPDF(form, 'blob') as { blob: Blob; nome: string }
      const file = new File([result.blob], result.nome, { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `EME ${form.incidente}` })
      } else {
        const url = URL.createObjectURL(result.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.nome
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        logError(error, { scope: 'lista', action: 'compartilhar-pdf', formId: form.id })
      }
    } finally {
      setGerandoShare(false)
      setCompartilhando(null)
    }
  }

  const formatarData = (iso: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatarDataServico = (d: string) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  const finalizados = formularios.filter(f => f.status === 'finalizado').length
  const rascunhos   = formularios.filter(f => f.status === 'rascunho').length

  const BASES = ['Bacabal', 'Santa Inês', 'Itapecuru Mirim', 'Pedreiras', 'Presidente Dutra', 'Barra do Corda']

  const termo = busca.toLowerCase().trim()
  const formulariosFiltrados = formularios
    .filter(f => !baseAtiva || f.base === baseAtiva)
    .filter(f => !termo || (
      f.incidente.toLowerCase().includes(termo) ||
      f.equipe.toLowerCase().includes(termo) ||
      f.municipio.toLowerCase().includes(termo) ||
      f.base.toLowerCase().includes(termo)
    ))

  return (
    <AppShell page="lista">

      {/* ── HERO HEADER ── */}
      <div
        className="relative w-full max-w-full overflow-hidden px-3 sm:px-4 md:px-6 lg:px-8 pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.5rem))] pb-6 sm:pb-8 lg:pt-8 lg:pb-10"
        style={{ background: 'linear-gradient(135deg, #6B0028 0%, #9B003C 45%, #C0014A 100%)' }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rotate-45 rounded-3xl bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rotate-45 rounded-2xl bg-white/5 pointer-events-none" />
        <div className="absolute top-6 right-10 w-16 h-16 rotate-45 rounded-xl bg-white/10 hidden lg:block pointer-events-none" />

        <div className="relative w-full max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto lg:flex lg:items-center lg:justify-between lg:gap-12 min-w-0">
          <div className="lg:flex-1 min-w-0">
            <div className="flex items-start sm:items-center justify-between gap-2 mb-4 sm:mb-6 lg:mb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 lg:hidden min-w-0">
                <div className="bg-white rounded-2xl p-2 shadow-lg shadow-black/20 flex-shrink-0">
                  <LogoCGB size={32} />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-lg sm:text-xl leading-none tracking-tight">CGB</p>
                  <p className="text-pink-200 text-[10px] sm:text-xs font-semibold tracking-widest uppercase truncate">Engenharia</p>
                </div>
              </div>

              <div className="lg:hidden flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={sincronizar}
                  disabled={sincronizando}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[44px] rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                  title="Sincronizar com o banco / R2"
                >
                  <RefreshCw size={14} className={sincronizando ? 'animate-spin' : ''} />
                  {sincronizando ? 'Sync…' : 'Sync'}
                </button>
                <button
                  onClick={toggle}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[44px] rounded-2xl text-xs font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                  title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
                </button>
              </div>
            </div>

            <h1 className="text-white font-black text-2xl sm:text-3xl lg:text-4xl leading-tight mb-1">
              <span className="lg:hidden">Meus formulários</span>
              <span className="hidden lg:inline">Atendimento Emergencial</span>
            </h1>
            <p className="text-pink-200 text-xs sm:text-sm lg:text-base mb-5 sm:mb-7 lg:mb-0 max-w-md">
              <span className="lg:hidden">Edite, compartilhe o link ou gere o PDF novamente</span>
              <span className="hidden lg:inline">Formulários de campo — offline</span>
            </p>
            {syncMsg && (
              <p className="lg:hidden mb-4 text-xs font-semibold text-pink-100/95 bg-black/15 rounded-xl px-3 py-2 break-words">
                {syncMsg}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 w-full lg:w-96 lg:flex-shrink-0">
            {[
              { label: 'Total',       value: formularios.length },
              { label: 'Rascunhos',   value: rascunhos },
              { label: 'Finalizados', value: finalizados },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl px-2 sm:px-3 py-2.5 sm:py-3 lg:py-4 text-center border border-white/15 min-w-0">
                <p className="text-white font-black text-xl sm:text-2xl lg:text-3xl leading-none tabular-nums">{carregando ? '—' : value}</p>
                <p className="text-pink-200 text-[10px] sm:text-xs mt-1 font-medium truncate">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="w-full max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+5rem))] lg:pb-10 min-w-0">

        <div className="hidden lg:flex flex-col sm:flex-row gap-3 mt-5 lg:mt-8">
          <button
            onClick={novoFormulario}
            className="flex flex-1 items-center justify-center gap-2 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #9B003C, #C0014A)', boxShadow: '0 8px 24px rgba(160,0,60,0.35)' }}
          >
            <Plus size={20} strokeWidth={2.5} />
            Novo Formulário
          </button>
          <button
            onClick={() => navigate('/acionamento')}
            className="flex items-center justify-center gap-2 px-5 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}
          >
            <Zap size={20} strokeWidth={2.5} />
            Acionamento
          </button>
        </div>

        <p className="lg:hidden mt-4 sm:mt-5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-snug">
          Use <span className="text-[#9B003C]">Editar</span>, <span className="text-[#9B003C]">PDF</span> ou <span className="text-[#9B003C]">Enviar</span> em cada ocorrência.
        </p>

        {!carregando && formularios.length > 0 && (
          <>
            <div className="relative mt-4 sm:mt-5 min-w-0">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Pesquisar incidente, equipe, município..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full min-w-0 pl-9 pr-9 py-3 rounded-2xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C0014A] focus:border-transparent transition"
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-1"
                  aria-label="Limpar busca"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filtro por base — scroll horizontal em celular/tablet */}
            <div className="-mx-3 sm:-mx-4 md:mx-0 mt-3 min-w-0">
              <div className="flex gap-2 px-3 sm:px-4 md:px-0 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
                <button
                  onClick={() => setBaseAtiva(null)}
                  className={`flex-shrink-0 px-3.5 py-2 min-h-[40px] rounded-full text-xs font-bold transition-all active:scale-95 ${
                    !baseAtiva
                      ? 'text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                  style={!baseAtiva
                    ? { background: 'linear-gradient(135deg,#9B003C,#C0014A)', boxShadow: '0 2px 8px rgba(160,0,60,0.3)' }
                    : undefined}
                >
                  Geral
                </button>
                {BASES.map((base) => {
                  const active = baseAtiva === base
                  return (
                    <button
                      key={base}
                      onClick={() => setBaseAtiva(b => b === base ? null : base)}
                      className={`flex-shrink-0 px-3.5 py-2 min-h-[40px] rounded-full text-xs font-bold transition-all active:scale-95 ${
                        active
                          ? 'text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                      style={active
                        ? { background: 'linear-gradient(135deg,#9B003C,#C0014A)', boxShadow: '0 2px 8px rgba(160,0,60,0.3)' }
                        : undefined}
                    >
                      {base}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {!carregando && formularios.length > 0 && (
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-5 mb-3 px-1">
            {termo ? `${formulariosFiltrados.length} resultado${formulariosFiltrados.length !== 1 ? 's' : ''}` : 'Registros recentes'}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3 min-w-0">
          {carregando && (
            <div className="text-center py-16 text-slate-400 md:col-span-2 xl:col-span-3">
              <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-3"
                style={{ borderColor: '#C0014A', borderTopColor: 'transparent' }} />
              <p className="text-sm">Carregando registros...</p>
            </div>
          )}

          {!carregando && formularios.length === 0 && (
            <div className="text-center py-16 md:col-span-2 xl:col-span-3">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-700 mx-auto max-w-xs">
                <div className="rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#FFF0F4' }}>
                  <FileText size={28} style={{ color: '#C0014A' }} />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-200 text-base">Nenhum registro ainda</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 leading-relaxed">
                  {isSolicitante
                    ? 'Toque em Solicitações para abrir um atendimento, ou aguarde o link da equipe.'
                    : 'Aguarde o link da equipe para preencher um atendimento.'}
                </p>
              </div>
            </div>
          )}

          {!carregando && formularios.length > 0 && formulariosFiltrados.length === 0 && (
            <div className="text-center py-12 md:col-span-2 xl:col-span-3">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-700 mx-auto max-w-xs">
                <div className="rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#FFF0F4' }}>
                  <Search size={28} style={{ color: '#C0014A' }} />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-200 text-base">Nenhum resultado</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 leading-relaxed break-words">
                  Nenhum formulário encontrado para &quot;{busca}&quot;.
                </p>
              </div>
            </div>
          )}

          {formulariosFiltrados.map((f) => (
            <div
              key={f.id}
              className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden transition-colors duration-300 min-w-0 flex flex-col"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: theme === 'dark' ? '1px solid #334155' : '1px solid #F0E4EA' }}
            >
              <div className="h-1.5 w-full flex-shrink-0" style={{
                background: f.status === 'finalizado'
                  ? 'linear-gradient(90deg, #059669, #10b981)'
                  : 'linear-gradient(90deg, #d97706, #fbbf24)'
              }} />

              <button
                onClick={() => navigate(`/formulario/${f.id}`)}
                className="w-full min-w-0 text-left px-3 sm:px-4 pt-3 pb-3 active:bg-slate-50 dark:active:bg-slate-700 lg:hover:bg-slate-50 dark:lg:hover:bg-slate-700/50 transition-colors flex-1"
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2 ${
                      f.status === 'finalizado'
                        ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30'
                        : 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30'
                    }`}>
                      {f.status === 'finalizado' ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {f.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                    </span>

                    <p className="font-black text-slate-800 dark:text-slate-100 text-base sm:text-lg leading-tight truncate">
                      {f.incidente || 'Sem identificação'}
                    </p>

                    <div className="mt-3 space-y-1.5 min-w-0">
                      {(f.dataInicio || f.dataFinal) && (
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-14 flex-shrink-0 pt-0.5">Período</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-0 break-words">
                            {formatarDataServico(f.dataInicio)}
                            {f.dataFinal && f.dataFinal !== f.dataInicio && (
                              <span className="text-slate-400 dark:text-slate-500 font-normal"> → {formatarDataServico(f.dataFinal)}</span>
                            )}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 min-w-0">
                        {f.base && (
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Base</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{f.base}</p>
                          </div>
                        )}
                        {f.municipio && (
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Município</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{f.municipio}</p>
                          </div>
                        )}
                      </div>

                      {f.equipe && (
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Equipe</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{f.equipe}</p>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-medium leading-snug">
                      Salvo {formatarData(f.atualizadoEm)}
                      {f.status === 'finalizado' && (
                        <span className="text-emerald-600 dark:text-emerald-400"> · editável</span>
                      )}
                    </p>
                  </div>

                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 mt-1 flex-shrink-0" />
                </div>
              </button>

              <div className="mx-3 sm:mx-4 h-px bg-slate-100 dark:bg-slate-700" />

              {/* Ações: grade estável no celular/tablet */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:px-4 sm:py-3">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/formulario/${f.id}`) }}
                  className="flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold transition-all active:scale-95 border-2"
                  style={{ borderColor: '#F0C0CC', color: '#9B003C', background: theme === 'dark' ? 'rgba(192,1,74,0.12)' : '#FFF5F8' }}
                  title="Abrir e editar ocorrência"
                >
                  <Pencil size={13} />
                  Editar
                </button>

                <button
                  onClick={(e) => gerarPDF(e, f)}
                  disabled={exportandoPDF === f.id}
                  className="flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #7B0029, #C0014A)',
                    boxShadow: '0 2px 8px rgba(160,0,60,0.3)'
                  }}
                >
                  {exportandoPDF === f.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <FileDown size={13} />}
                  PDF
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setCompartilhando(f.id) }}
                  className="flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold transition-all active:scale-95 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #14532d, #16a34a)',
                    boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
                  }}
                >
                  <Share2 size={13} />
                  Enviar
                </button>

                <button
                  onClick={() => setExcluindo(f.id)}
                  className="flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[44px] rounded-2xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-200 dark:border-slate-600 transition"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL COMPARTILHAR ── */}
      {compartilhando && (() => {
        const form = formularios.find(f => f.id === compartilhando)
        if (!form) return null
        return (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-3 sm:p-4 safe-bottom"
            onClick={() => !gerandoShare && setCompartilhando(null)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-sm max-h-[min(90svh,40rem)] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="rounded-2xl w-14 h-14 flex items-center justify-center mx-auto mb-3"
                  style={{ background: '#F0FDF4' }}>
                  <Share2 size={24} className="text-green-600" />
                </div>
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-100">Compartilhar</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Incidente <span className="font-bold text-slate-700 dark:text-slate-200">{form.incidente || '—'}</span>
                </p>
              </div>

              {/* ── Link do formulário ── */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Link size={11} /> Link para preenchimento
                </p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-3 py-2.5 border border-slate-200 dark:border-slate-600">
                  <p className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                    {urlDeFormulario(form.id)}
                  </p>
                  <button
                    onClick={() => copiarLink(form.id)}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{ background: copiadoLink ? '#16a34a' : '#C0014A', color: 'white' }}
                  >
                    {copiadoLink ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => compartilharLink(form, 'whatsapp')}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)' }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => compartilharLink(form, 'telegram')}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #0077B5, #2AABEE)' }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Telegram
                  </button>
                </div>
              </div>

              {/* ── Compartilhar PDF ── */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <FileDown size={11} /> Enviar PDF
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => compartilharPDF(form)}
                    disabled={gerandoShare}
                    className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}
                  >
                    {gerandoShare ? <Loader2 size={16} className="animate-spin" /> : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
                    WhatsApp
                  </button>
                  <button
                    onClick={() => compartilharPDF(form)}
                    disabled={gerandoShare}
                    className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0077B5, #2AABEE)', boxShadow: '0 4px 12px rgba(42,171,238,0.3)' }}
                  >
                    {gerandoShare ? <Loader2 size={16} className="animate-spin" /> : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>}
                    Telegram
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setCompartilhando(null); setCopiadoLink(false) }}
                disabled={gerandoShare}
                className="w-full py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-600 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── MODAL EXCLUIR ── */}
      {excluindo && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-4"
          onClick={() => setExcluindo(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="font-black text-xl text-slate-800 dark:text-slate-100">Excluir formulário?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                Esta ação não pode ser desfeita. Todos os dados e fotos serão permanentemente removidos.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setExcluindo(null)}
                className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-600 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluir(excluindo)}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition shadow-md shadow-red-200"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── RODAPÉ CRIADOR ── */}
      <div className="max-w-lg mx-auto lg:max-w-6xl px-4 lg:px-8 py-6 mt-2">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-600 font-medium tracking-wide uppercase">
            Desenvolvido por
          </p>
          <a
            href="https://www.instagram.com/italofontes__?utm_source=qr&igsh=NmUwbnVwZWE2ems2"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            <span className="text-sm font-black text-slate-500 dark:text-slate-400 group-hover:text-[#C0014A] transition-colors">
              Italo Fontes
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-[#E1306C] transition-colors">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
              @italofontes__
            </span>
          </a>
        </div>
      </div>
    </AppShell>
  )
}
