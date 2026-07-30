import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, Sun, Moon, Save, CheckCircle, Trash2, Plus, FileDown } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import AppShell from '../components/layout/AppShell'
import { salvarAcionamento, buscarAcionamento, listarAcionamentos, excluirAcionamento, buscarFormulario, salvarFormulario, listarFormularios } from '../store/db'
import { type AcionamentoData, emptyAcionamento } from '../types/acionamento'
import type { FormularioEME } from '../types/eme'
import PhotoCapture from '../components/ui/PhotoCapture'
import { logError } from '../utils/telemetry'

/** Aplica os campos preenchidos aqui no formulário EME vinculado (fica visível no PDF completo). */
function aplicarAcionamentoNoForm(form: FormularioEME, d: AcionamentoData): FormularioEME {
  return {
    ...form,
    acionamentoResponsavelEqtl: d.responsavelEqtl,
    acionamentoVia: d.via,
    acionamentoDataHora: d.dataHoraAcionamento,
    acionamentoChegadaBase: d.dataHoraChegadaBase,
    acionamentoQuebraProgramacao: d.quebraProgramacao,
    acionamentoPep: d.pep,
    fotoAcionamento: d.fotoAcionamento,
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </label>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  const forceUpper = !type || type === 'text'
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(forceUpper ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      autoCapitalize={forceUpper ? 'characters' : undefined}
      className={`w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900/30 transition ${forceUpper ? 'uppercase' : ''}`}
    />
  )
}

function incFromName(name: string): string {
  const m = name.match(/^EME_([^_.]+)/i)
  return m?.[1] ?? ''
}

export default function Acionamento() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggle } = useTheme()

  const [pdfName, setPdfName]     = useState('')
  const [data, setData]           = useState<AcionamentoData>(emptyAcionamento)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [savedList, setSavedList] = useState<{ name: string; savedAt: string }[]>([])
  const [editando, setEditando]   = useState(false)
  // Formulário EME vinculado (via card da Lista) — permite gravar o acionamento
  // direto nos campos do formulário e gerar o PDF completo com tudo já preenchido.
  const [form, setForm]           = useState<FormularioEME | null>(null)
  const [gerandoPDF, setGerandoPDF] = useState(false)

  const recarregarLista = useCallback(async () => {
    const lista = await listarAcionamentos()
    setSavedList(lista.map(r => ({ name: r.name, savedAt: r.savedAt })))
  }, [])

  useEffect(() => { recarregarLista() }, [recarregarLista])

  // Abre direto em modo edição quando navegado a partir de um formulário da lista.
  // Rastreia o último incidente carregado (não só "já rodou uma vez") para recarregar
  // corretamente se o usuário voltar e abrir o Acionamento de OUTRO formulário na mesma sessão.
  const lastIncidenteRef = useRef<string | null>(null)
  useEffect(() => {
    const state = location.state as { incidente?: string; formId?: string } | null
    if (!state?.incidente || lastIncidenteRef.current === state.incidente) return
    lastIncidenteRef.current = state.incidente
    const nome = `EME_${state.incidente}`

    setForm(null)
    if (state.formId) {
      buscarFormulario(state.formId).then((f) => { if (f) setForm(f) })
    }

    buscarAcionamento(nome).then(async (existing) => {
      if (existing) {
        setData(existing.data)
        setPdfName(existing.name)
        setEditando(true)
      } else {
        setData(emptyAcionamento)
        setPdfName(nome)
        setEditando(true)
        await salvarAcionamento({ name: nome, data: emptyAcionamento, pdfBytes: new Uint8Array(), savedAt: new Date().toISOString() })
        await recarregarLista()
      }
    })
  }, [location.state, recarregarLista])

  const salvar = useCallback(async (name: string, d: AcionamentoData) => {
    setSaveState('saving')
    await salvarAcionamento({ name, data: d, pdfBytes: new Uint8Array(), savedAt: new Date().toISOString() })
    await recarregarLista()
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }, [recarregarLista])

  const set = (partial: Partial<AcionamentoData>) => {
    const updated = { ...data, ...partial }
    setData(updated)
    if (pdfName) salvar(pdfName, updated)

    // Grava também no formulário EME vinculado — fica no PDF completo e sincroniza com o banco.
    if (form) {
      const updatedForm = aplicarAcionamentoNoForm(form, updated)
      setForm(updatedForm)
      void salvarFormulario(updatedForm)
    }
  }

  const novoAcionamento = useCallback(async () => {
    const now = new Date()
    const d = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    const h = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`
    const nome = `ACIONAMENTO_${d}_${h}`
    setData(emptyAcionamento)
    setPdfName(nome)
    setForm(null)
    lastIncidenteRef.current = null
    setEditando(true)
    await salvarAcionamento({ name: nome, data: emptyAcionamento, pdfBytes: new Uint8Array(), savedAt: now.toISOString() })
    await recarregarLista()
  }, [recarregarLista])

  const gerarPDFCompleto = async () => {
    if (!form || gerandoPDF) return
    setGerandoPDF(true)
    try {
      const atualizado = aplicarAcionamentoNoForm(form, data)
      const { exportarPDF } = await import('../utils/exportPDF')
      await exportarPDF(atualizado)
    } catch (error) {
      logError(error, { scope: 'acionamento', action: 'exportar-pdf-completo', formId: form.id })
    } finally {
      setGerandoPDF(false)
    }
  }

  const fecharEdicao = () => {
    setEditando(false)
    setPdfName('')
    setData(emptyAcionamento)
    setForm(null)
    lastIncidenteRef.current = null
  }

  return (
    <AppShell page="acionamento">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex-1 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-40 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7B0029 0%, #C0014A 100%)' }}>
        <div className="px-4 lg:px-8 py-3 flex items-center gap-3 max-w-7xl mx-auto w-full">
          <button
            onClick={editando ? fecharEdicao : () => navigate('/')}
            className="p-1.5 -ml-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: 'rgba(255,200,210,0.85)' }}>
              {editando ? 'Preenchendo' : 'Editor de Acionamento'}
            </p>
            <p className="text-sm font-semibold truncate">
              {editando ? (pdfName || 'Acionamento') : 'Acionamento'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saveState === 'saving' && <Loader2 size={14} className="animate-spin opacity-70" />}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-300">
                <CheckCircle size={13} /> Salvo
              </span>
            )}
            <button onClick={toggle} className="lg:hidden p-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {editando && (
              <button
                onClick={() => salvar(pdfName, data)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <Save size={14} /> Salvar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 lg:px-8 pt-5 pb-10 w-full flex-1">

        {/* ── Lista de acionamentos ── */}
        {!editando && (
          <div className="space-y-4 mt-4">
            <button
              onClick={novoAcionamento}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)', boxShadow: '0 8px 24px rgba(160,0,60,0.25)' }}
            >
              <Plus size={18} /> Novo Acionamento
            </button>

            {savedList.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Acionamentos salvos
                  </p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {savedList.map(({ name, savedAt }) => (
                    <div key={name} className="flex items-center justify-between px-5 py-3.5 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{name}</p>
                        {savedAt && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Salvo em {new Date(savedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const record = await buscarAcionamento(name)
                            if (!record) return
                            setData(record.data)
                            setPdfName(record.name)
                            lastIncidenteRef.current = null

                            // Vincula ao formulário EME correspondente (se houver) — habilita o PDF completo
                            const inc = incFromName(record.name)
                            if (inc) {
                              const todos = await listarFormularios()
                              const match = todos.find((f) => f.incidente === inc)
                              setForm(match ?? null)
                            } else {
                              setForm(null)
                            }

                            setEditando(true)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition"
                          style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)' }}
                        >
                          Abrir
                        </button>
                        <button
                          onClick={async () => {
                            await excluirAcionamento(name)
                            await recarregarLista()
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {savedList.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm font-medium">Nenhum acionamento salvo ainda.</p>
                <p className="text-xs mt-1">Use o botão acima ou acesse pelo formulário.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Formulário de acionamento ── */}
        {editando && (
          <div className="space-y-4 mt-4">

            {/* Card: Identificação */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 space-y-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                <div className="w-1 h-5 rounded-full" style={{ background: '#C0014A' }} />
                <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Identificação
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Responsável EQTL Acionamento</Label>
                  <Input value={data.responsavelEqtl} onChange={(v) => set({ responsavelEqtl: v })}
                    placeholder="Nome do responsável" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Via</Label>
                  <Input value={data.via} onChange={(v) => set({ via: v })}
                    placeholder="Ex: Telefone, Rádio..." />
                </div>
              </div>
            </div>

            {/* Card: Horários */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 space-y-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                <div className="w-1 h-5 rounded-full" style={{ background: '#C0014A' }} />
                <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Horários
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Acionamento</Label>
                  <Input value={data.dataHoraAcionamento} onChange={(v) => set({ dataHoraAcionamento: v })}
                    type="datetime-local" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Chegada na Base</Label>
                  <Input value={data.dataHoraChegadaBase} onChange={(v) => set({ dataHoraChegadaBase: v })}
                    type="datetime-local" />
                </div>
              </div>
            </div>

            {/* Card: Quebra de Programação */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 space-y-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                <div className="w-1 h-5 rounded-full" style={{ background: '#C0014A' }} />
                <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Quebra de Programação
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Houve quebra de programação?</Label>
                  <div className="flex gap-2">
                    {(['sim', 'nao'] as const).map((op) => (
                      <button key={op} type="button"
                        onClick={() => set({ quebraProgramacao: op })}
                        className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all border-2"
                        style={data.quebraProgramacao === op ? {
                          background: op === 'sim' ? '#FFF0F4' : '#F0FFF4',
                          borderColor: op === 'sim' ? '#C0014A' : '#059669',
                          color: op === 'sim' ? '#C0014A' : '#059669',
                        } : { background: 'transparent', borderColor: '#E2E8F0', color: '#94A3B8' }}>
                        {op === 'sim' ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                </div>
                {data.quebraProgramacao === 'sim' && (
                  <div className="flex flex-col gap-1.5">
                    <Label>PEP</Label>
                    <Input value={data.pep} onChange={(v) => set({ pep: v })}
                      placeholder="Número do PEP" />
                  </div>
                )}
              </div>
            </div>

            {/* Card: Foto */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 space-y-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                <div className="w-1 h-5 rounded-full" style={{ background: '#C0014A' }} />
                <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Foto do Acionamento
                </h2>
              </div>
              <PhotoCapture
                label="Foto do Acionamento"
                value={data.fotoAcionamento}
                onChange={(v) => set({ fotoAcionamento: v })}
                incidente={incFromName(pdfName)}
              />
            </div>

            <button
              onClick={() => salvar(pdfName, data)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)', boxShadow: '0 8px 24px rgba(160,0,60,0.3)' }}
            >
              <Save size={18} /> Salvar Acionamento
            </button>

            {form && (
              <button
                onClick={gerarPDFCompleto}
                disabled={gerandoPDF}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', boxShadow: '0 8px 24px rgba(37,99,235,0.28)' }}
              >
                {gerandoPDF ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                {gerandoPDF ? 'Gerando PDF completo…' : 'Gerar PDF Completo'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </AppShell>
  )
}
