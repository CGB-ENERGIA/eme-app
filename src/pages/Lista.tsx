import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Trash2, CheckCircle, Clock, ChevronRight, FileDown, Loader2, Sun, Moon, Zap, Search, X } from 'lucide-react'
import { listarFormularios, excluirFormulario } from '../store/db'
import type { FormularioEME } from '../types/eme'
import { criarFormularioVazio } from '../types/eme'
import { salvarFormulario } from '../store/db'
import { useTheme } from '../contexts/ThemeContext'
import AppShell from '../components/layout/AppShell'
import LogoCGB from '../components/ui/LogoCGB'
import { logError } from '../utils/telemetry'

export default function Lista() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [formularios, setFormularios] = useState<FormularioEME[]>([])
  const [carregando, setCarregando] = useState(true)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [exportandoPDF, setExportandoPDF] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const carregar = async () => {
    setCarregando(true)
    const lista = await listarFormularios()
    setFormularios(lista)
    setCarregando(false)
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

  const termo = busca.toLowerCase().trim()
  const formulariosFiltrados = termo
    ? formularios.filter(f =>
        f.incidente.toLowerCase().includes(termo) ||
        f.equipe.toLowerCase().includes(termo) ||
        f.municipio.toLowerCase().includes(termo) ||
        f.base.toLowerCase().includes(termo)
      )
    : formularios

  return (
    <AppShell page="lista">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden px-4 pt-14 pb-8 lg:pt-8 lg:pb-10 lg:px-8"
        style={{ background: 'linear-gradient(135deg, #6B0028 0%, #9B003C 45%, #C0014A 100%)' }}>

        <div className="absolute -top-20 -right-20 w-72 h-72 rotate-45 rounded-3xl bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rotate-45 rounded-2xl bg-white/5" />
        <div className="absolute top-6 right-10 w-16 h-16 rotate-45 rounded-xl bg-white/10 hidden lg:block" />
        <div className="absolute bottom-8 right-32 w-8 h-8 rotate-45 rounded-md bg-white/10 hidden lg:block" />

        <div className="relative max-w-lg mx-auto lg:max-w-6xl lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div className="lg:flex-1">
            <div className="flex items-center justify-between mb-6 lg:mb-4">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="bg-white rounded-2xl p-2 shadow-lg shadow-black/20">
                  <LogoCGB size={34} />
                </div>
                <div>
                  <p className="text-white font-black text-xl leading-none tracking-tight">CGB</p>
                  <p className="text-pink-200 text-xs font-semibold tracking-widest uppercase">Engenharia</p>
                </div>
              </div>

              {/* Toggle dark/light — mobile only (desktop: sidebar) */}
              <button
                onClick={toggle}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              >
                {theme === 'dark'
                  ? <><Sun size={14} /> Claro</>
                  : <><Moon size={14} /> Escuro</>}
              </button>
            </div>

            <h1 className="text-white font-black text-3xl lg:text-4xl leading-tight mb-1">
              <span className="lg:hidden">Atendimento<br />Emergencial</span>
              <span className="hidden lg:inline">Atendimento Emergencial</span>
            </h1>
            <p className="text-pink-200 text-sm lg:text-base mb-7 lg:mb-0">
              Formulários de campo — offline
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:gap-4 lg:w-96 lg:flex-shrink-0">
            {[
              { label: 'Total',       value: formularios.length },
              { label: 'Rascunhos',   value: rascunhos },
              { label: 'Finalizados', value: finalizados },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-3 lg:py-4 text-center border border-white/15">
                <p className="text-white font-black text-2xl lg:text-3xl leading-none">{carregando ? '—' : value}</p>
                <p className="text-pink-200 text-xs mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="max-w-lg mx-auto lg:max-w-6xl px-4 lg:px-8 pb-24 lg:pb-10">

        <div className="flex flex-col sm:flex-row gap-3 mt-5 lg:mt-8">
          <button
            onClick={novoFormulario}
            className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-4 lg:py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #9B003C, #C0014A)', boxShadow: '0 8px 24px rgba(160,0,60,0.35)' }}
          >
            <Plus size={20} strokeWidth={2.5} />
            Novo Formulário
          </button>
          <button
            onClick={() => navigate('/acionamento')}
            className="flex items-center justify-center gap-2 px-5 sm:flex-none text-white font-bold py-4 lg:py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}
          >
            <Zap size={20} strokeWidth={2.5} />
            Acionamento
          </button>
        </div>

        {!carregando && formularios.length > 0 && (
          <div className="relative mt-5">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar por incidente, equipe, município..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-9 py-3 rounded-2xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C0014A] focus:border-transparent transition"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {!carregando && formularios.length > 0 && (
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-5 mb-3 px-1">
            {termo ? `${formulariosFiltrados.length} resultado${formulariosFiltrados.length !== 1 ? 's' : ''}` : 'Registros recentes'}
          </p>
        )}

        <div className="space-y-3 mt-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
          {carregando && (
            <div className="text-center py-16 text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-3"
                style={{ borderColor: '#C0014A', borderTopColor: 'transparent' }} />
              <p className="text-sm">Carregando registros...</p>
            </div>
          )}

          {!carregando && formularios.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 mx-auto max-w-xs">
                <div className="rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#FFF0F4' }}>
                  <FileText size={28} style={{ color: '#C0014A' }} />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-200 text-base">Nenhum registro ainda</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 leading-relaxed">
                  Toque em "Novo Formulário" para registrar um atendimento emergencial.
                </p>
              </div>
            </div>
          )}

          {!carregando && formularios.length > 0 && formulariosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 mx-auto max-w-xs">
                <div className="rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#FFF0F4' }}>
                  <Search size={28} style={{ color: '#C0014A' }} />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-200 text-base">Nenhum resultado</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 leading-relaxed">
                  Nenhum formulário encontrado para "{busca}".
                </p>
              </div>
            </div>
          )}

          {formulariosFiltrados.map((f) => (
            <div key={f.id}
              className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden transition-colors duration-300"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: theme === 'dark' ? '1px solid #334155' : '1px solid #F0E4EA' }}>

              {/* Faixa de status no topo */}
              <div className="h-1.5 w-full" style={{
                background: f.status === 'finalizado'
                  ? 'linear-gradient(90deg, #059669, #10b981)'
                  : 'linear-gradient(90deg, #d97706, #fbbf24)'
              }} />

              {/* Corpo clicável */}
              <button
                onClick={() => navigate(`/formulario/${f.id}`)}
                className="w-full text-left px-4 pt-3 pb-3 active:bg-slate-50 dark:active:bg-slate-700 lg:hover:bg-slate-50 dark:lg:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">

                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2 ${
                      f.status === 'finalizado'
                        ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30'
                        : 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30'
                    }`}>
                      {f.status === 'finalizado' ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {f.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                    </span>

                    <p className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight truncate">
                      {f.incidente || 'Sem identificação'}
                    </p>

                    <div className="mt-3 space-y-1.5">
                      {(f.dataInicio || f.dataFinal) && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-14 flex-shrink-0">Período</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {formatarDataServico(f.dataInicio)}
                            {f.dataFinal && f.dataFinal !== f.dataInicio && (
                              <span className="text-slate-400 dark:text-slate-500 font-normal"> → {formatarDataServico(f.dataFinal)}</span>
                            )}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-4">
                        {f.base && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Base</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{f.base}</p>
                          </div>
                        )}
                        {f.municipio && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Município</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{f.municipio}</p>
                          </div>
                        )}
                      </div>

                      {f.equipe && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Equipe</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{f.equipe}</p>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-medium">
                      Salvo {formatarData(f.atualizadoEm)}
                    </p>
                  </div>

                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 mt-1 flex-shrink-0" />
                </div>
              </button>

              {/* Separador */}
              <div className="mx-4 h-px bg-slate-100 dark:bg-slate-700" />

              {/* Rodapé de ações */}
              <div className="flex items-center justify-between px-4 py-3 gap-2">
                <button
                  onClick={(e) => gerarPDF(e, f)}
                  disabled={exportandoPDF === f.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #7B0029, #C0014A)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(160,0,60,0.3)'
                  }}
                >
                  {exportandoPDF === f.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <FileDown size={13} />}
                  PDF
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/acionamento') }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
                  }}
                >
                  <Zap size={13} />
                  Acionamento
                </button>

                <button
                  onClick={() => setExcluindo(f.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
    </AppShell>
  )
}
