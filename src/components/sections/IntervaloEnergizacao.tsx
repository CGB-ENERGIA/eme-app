import { useEffect, useState } from 'react'
import { Clock, CheckCircle, Lock } from 'lucide-react'
import type { FormularioEME } from '../../types/eme'
import SectionCard from '../ui/SectionCard'
import TimeInput from '../ui/TimeInput'

interface Props {
  form: FormularioEME
  onChange: (partial: Partial<FormularioEME>) => void
  showErrors?: boolean
  focusModal?: boolean
  onModalClose?: () => void
}

function duracaoLabel(valor: string) {
  const [h, m] = valor.split(':').map(Number)
  const totalMins = (h || 0) * 60 + (m || 0)
  if (!totalMins) return null
  if (totalMins < 60) return `${totalMins} minuto${totalMins !== 1 ? 's' : ''}`
  if (totalMins % 60 === 0) { const hr = totalMins / 60; return `${hr} hora${hr !== 1 ? 's' : ''}` }
  const hr = Math.floor(totalMins / 60); const mn = totalMins % 60
  return `${hr} hora${hr !== 1 ? 's' : ''} e ${mn} minuto${mn !== 1 ? 's' : ''}`
}

export default function IntervaloEnergizacao({ form, onChange, showErrors, focusModal, onModalClose }: Props) {
  const horaError = showErrors && !form.horaEnergizacao
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!focusModal) setConfirmed(false)
  }, [focusModal])

  // Regra: com intervalo, a duração é sempre 1h fixa — corrige registros
  // antigos (salvos antes dessa regra) que possam ter outro valor.
  useEffect(() => {
    if (form.houveIntervalo && form.duracaoIntervalo !== '01:00') {
      onChange({ duracaoIntervalo: '01:00' })
    }
  }, [form.houveIntervalo, form.duracaoIntervalo, onChange])

  const handleConfirm = () => {
    if (!form.horaEnergizacao) return
    setConfirmed(true)
    onModalClose?.()
  }

  return (
    <>
      {/* ── MODAL DE FOCO ── */}
      {focusModal && !confirmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out' }}>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center"
              style={{ background: 'linear-gradient(135deg, #7B0029 0%, #C0014A 100%)' }}>
              <div className="bg-white/20 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto mb-3">
                <Clock size={28} className="text-white" />
              </div>
              <h3 className="text-white font-black text-lg">Hora de Energização</h3>
              <p className="text-pink-200 text-sm mt-1">Informe o horário de energização do sistema</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Hora energização */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 text-center">
                  Horário <span className="text-red-500">*</span>
                </span>
                <TimeInput
                  value={form.horaEnergizacao}
                  onChange={(v) => onChange({ horaEnergizacao: v })}
                />
              </div>

              {/* Intervalo */}
              <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block text-center">
                  Atendimento foi iniciado depois das 14:00h?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onChange({ houveIntervalo: false, duracaoIntervalo: '' })}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all border-2"
                    style={!form.houveIntervalo
                      ? { background: '#F0FFF4', borderColor: '#059669', color: '#059669' }
                      : { background: 'transparent', borderColor: '#E2E8F0', color: '#94A3B8' }}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ houveIntervalo: true, duracaoIntervalo: '01:00' })}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all border-2"
                    style={form.houveIntervalo
                      ? { background: '#FFF0F4', borderColor: '#C0014A', color: '#C0014A' }
                      : { background: 'transparent', borderColor: '#E2E8F0', color: '#94A3B8' }}
                  >
                    Não
                  </button>
                </div>

                {form.houveIntervalo && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide text-center">
                      Duração do Intervalo
                    </span>
                    <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-3">
                      <Lock size={14} className="text-slate-400" />
                      <span className="text-2xl font-black text-slate-600 dark:text-slate-300 tabular-nums">01:00</span>
                    </div>
                    <span className="text-sm font-semibold text-center" style={{ color: '#9B003C' }}>
                      {duracaoLabel('01:00')} — obrigatório por regra
                    </span>
                  </div>
                )}
              </div>

              {/* Confirmar */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!form.horaEnergizacao}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)', boxShadow: '0 4px 16px rgba(160,0,60,0.3)' }}
              >
                <CheckCircle size={20} />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEÇÃO NORMAL ── */}
      <div id="secao-intervalo-energizacao">
          <SectionCard title="Intervalo e Energização" icon={<Clock size={16} />}>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Atendimento foi iniciado depois das 14:00h?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ houveIntervalo: false, duracaoIntervalo: '' })}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2"
                  style={!form.houveIntervalo
                    ? { background: '#F0FFF4', borderColor: '#059669', color: '#059669' }
                    : { background: 'transparent', borderColor: '#E2E8F0', color: '#94A3B8' }}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ houveIntervalo: true, duracaoIntervalo: '01:00' })}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2"
                  style={form.houveIntervalo
                    ? { background: '#FFF0F4', borderColor: '#C0014A', color: '#C0014A' }
                    : { background: 'transparent', borderColor: '#E2E8F0', color: '#94A3B8' }}
                >
                  Não
                </button>
              </div>
            </div>

            {form.houveIntervalo && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Duração do Intervalo</span>
                <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-2.5">
                  <Lock size={13} className="text-slate-400" />
                  <span className="text-lg font-black text-slate-600 dark:text-slate-300 tabular-nums">01:00</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#9B003C' }}>
                  {duracaoLabel('01:00')} — obrigatório por regra
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide flex items-center gap-1"
                style={{ color: horaError ? '#ef4444' : '#64748b' }}>
                Hora de Energização do Sistema
                <span className="text-red-500">*</span>
              </span>
              <TimeInput
                value={form.horaEnergizacao}
                onChange={(v) => onChange({ horaEnergizacao: v })}
                error={horaError}
              />
              {horaError && <span className="text-xs text-red-500 font-medium">Campo obrigatório</span>}
            </div>

          </SectionCard>
        </div>
    </>
  )
}
