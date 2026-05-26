import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save, FileDown, Sheet, CheckCircle, Loader2, ChevronLeft, Sun, Moon } from 'lucide-react'
import { buscarFormulario, salvarFormulario } from '../store/db'
import type { FormularioEME } from '../types/eme'
import { criarFormularioVazio } from '../types/eme'
import DadosIncidente from '../components/sections/DadosIncidente'
import IntervaloEnergizacao from '../components/sections/IntervaloEnergizacao'
import Evidencias from '../components/sections/Evidencias'
import FotosServico from '../components/sections/FotosServico'
import Observacao from '../components/sections/Observacao'
import { exportarPDF } from '../utils/exportPDF'
import { exportarExcel } from '../utils/exportExcel'
import { useTheme } from '../contexts/ThemeContext'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const STEPS = [
  { label: 'Dados do Incidente', short: 'Dados' },
  { label: 'Fotos do Serviço', short: 'Fotos' },
  { label: 'Evidências', short: 'Evidências' },
  { label: 'Energização', short: 'Energização' },
  { label: 'Observação', short: 'Obs.' },
]

function validarStep(step: number, form: FormularioEME): string[] {
  const erros: string[] = []
  if (step === 0) {
    if (!form.incidente) erros.push('incidente')
    if (!form.base) erros.push('base')
    if (!form.municipio) erros.push('municipio')
    if (!form.dataInicio) erros.push('dataInicio')
    if (!form.dataFinal) erros.push('dataFinal')
    if (!form.equipe) erros.push('equipe')
    if (!form.supervisor) erros.push('supervisor')
  }
  if (step === 1) {
    if (!form.fotoChegadaBase) erros.push('fotoChegadaBase')
    if (!form.fotoChegadaServico) erros.push('fotoChegadaServico')
  }
  if (step === 2) {
    if (!form.fotoEnergizacao) erros.push('fotoEnergizacao')
  }
  if (step === 3) {
    if (!form.horaEnergizacao) erros.push('horaEnergizacao')
  }
  return erros
}

export default function Formulario() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [form, setForm] = useState<FormularioEME | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepErrors, setStepErrors] = useState<string[]>([])
  const [showEnergizacaoModal, setShowEnergizacaoModal] = useState(false)

  useEffect(() => {
    if (!id) return
    buscarFormulario(id).then((f) => {
      setForm(f ?? criarFormularioVazio())
    })
  }, [id])

  const salvar = useCallback(async (formAtual: FormularioEME) => {
    setSaveState('saving')
    try {
      await salvarFormulario(formAtual)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }, [])

  const onChange = useCallback((partial: Partial<FormularioEME>) => {
    setForm((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...partial }
      salvar(updated)
      return updated
    })
    if ('fotoEnergizacao' in partial && partial.fotoEnergizacao) {
      setShowEnergizacaoModal(true)
    }
  }, [salvar])

  const avancar = () => {
    if (!form) return
    const erros = validarStep(currentStep, form)
    if (erros.length > 0) {
      setStepErrors(erros)
      return
    }
    setStepErrors([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const voltar = () => {
    setStepErrors([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  const finalizar = async () => {
    if (!form) return
    const erros = validarStep(currentStep, form)
    if (erros.length > 0) {
      setStepErrors(erros)
      return
    }
    const atualizado = { ...form, status: 'finalizado' as const }
    await salvarFormulario(atualizado)
    setForm(atualizado)
    navigate('/')
  }

  const handleExportPDF = async () => {
    if (!form) return
    setExportando('pdf')
    setShowExportMenu(false)
    try { await exportarPDF(form) } finally { setExportando(null) }
  }

  const handleExportExcel = async () => {
    if (!form) return
    setExportando('excel')
    setShowExportMenu(false)
    try { await exportarExcel(form) } finally { setExportando(null) }
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full"
          style={{ borderColor: '#C0014A', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 transition-colors duration-300">

      {/* Header */}
      <div
        className="sticky top-0 z-40 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7B0029 0%, #C0014A 100%)' }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 -ml-1.5 rounded-xl transition"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: 'rgba(255,200,210,0.85)' }}>Formulário EME</p>
            <p className="text-sm font-semibold truncate">{form.incidente || 'Novo atendimento'}</p>
          </div>

          <div className="flex items-center gap-2">
            {saveState === 'saving' && <Loader2 size={16} className="animate-spin opacity-70" />}
            {saveState === 'saved'  && <CheckCircle size={16} className="text-green-300" />}
            {saveState === 'error'  && <span className="text-xs text-red-300">Erro ao salvar</span>}

            <button
              onClick={toggle}
              className="p-1.5 rounded-xl transition"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu((v) => !v)}
                disabled={!!exportando}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition disabled:opacity-60"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                {exportando ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                Exportar
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-10 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-w-44 z-50">
                  <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-sm">
                    <FileDown size={16} className="text-red-500" />
                    Exportar PDF
                  </button>
                  <button onClick={handleExportExcel} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-sm border-t border-slate-100">
                    <Sheet size={16} className="text-emerald-500" />
                    Exportar Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          {/* Step dots */}
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((_step, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full h-1 rounded-full transition-all duration-300"
                  style={{
                    background: i <= currentStep
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.25)',
                  }}
                />
              </div>
            ))}
          </div>
          {/* Step label */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/90">
              {STEPS[currentStep].label}
            </span>
            <span className="text-xs font-medium" style={{ color: 'rgba(255,200,210,0.8)' }}>
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {currentStep === 0 && (
          <DadosIncidente form={form} onChange={onChange} showErrors={stepErrors.length > 0} />
        )}

        {currentStep === 1 && (
          <FotosServico form={form} onChange={onChange} showErrors={stepErrors.length > 0} />
        )}

        {currentStep === 2 && (
          <Evidencias form={form} onChange={onChange} showErrors={stepErrors.length > 0} />
        )}

        {currentStep === 3 && (
          <IntervaloEnergizacao
            form={form}
            onChange={onChange}
            showErrors={stepErrors.length > 0}
            focusModal={showEnergizacaoModal}
            onModalClose={() => setShowEnergizacaoModal(false)}
          />
        )}

        {currentStep === 4 && (
          <Observacao form={form} onChange={onChange} />
        )}

        {/* Validation error summary */}
        {stepErrors.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <span className="text-red-500 mt-0.5 text-base">⚠</span>
            <p className="text-sm text-red-600 font-medium">
              Preencha todos os campos obrigatórios antes de continuar.
            </p>
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 p-4 z-30">
        <div className="max-w-lg mx-auto flex gap-3">

          {currentStep === 0 ? (
            <button
              onClick={() => { salvar(form); navigate('/') }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 font-semibold transition"
              style={{ borderColor: '#F0C0CC', color: '#9B003C' }}
            >
              <Save size={18} />
              Salvar
            </button>
          ) : (
            <button
              onClick={voltar}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 font-semibold transition"
              style={{ borderColor: '#F0C0CC', color: '#9B003C' }}
            >
              <ChevronLeft size={18} />
              Voltar
            </button>
          )}

          {isLastStep ? (
            <button
              onClick={finalizar}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold shadow-md transition"
              style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)', boxShadow: '0 4px 16px rgba(160,0,60,0.3)' }}
            >
              <CheckCircle size={18} />
              Finalizar
            </button>
          ) : (
            <button
              onClick={avancar}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold shadow-md transition"
              style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)', boxShadow: '0 4px 16px rgba(160,0,60,0.3)' }}
            >
              Próximo
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      {showExportMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
      )}
    </div>
  )
}
