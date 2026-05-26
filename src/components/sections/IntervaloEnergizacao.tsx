import { useEffect, useState } from 'react'
import { Clock, CheckCircle } from 'lucide-react'
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
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded accent-[#C0014A]"
                    checked={form.houveIntervalo}
                    onChange={(e) => onChange({ houveIntervalo: e.target.checked, duracaoIntervalo: e.target.checked ? form.duracaoIntervalo : '' })}
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Houve intervalo?</span>
                </label>

                {form.houveIntervalo && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide text-center">
                      Duração do Intervalo
                    </span>
                    <TimeInput
                      value={form.duracaoIntervalo}
                      onChange={(v) => onChange({ duracaoIntervalo: v })}
                    />
                    {form.duracaoIntervalo && duracaoLabel(form.duracaoIntervalo) && (
                      <span className="text-sm font-semibold text-center" style={{ color: '#9B003C' }}>
                        {duracaoLabel(form.duracaoIntervalo)}
                      </span>
                    )}
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

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-[#C0014A]"
                  checked={form.houveIntervalo}
                  onChange={(e) => onChange({ houveIntervalo: e.target.checked, duracaoIntervalo: e.target.checked ? form.duracaoIntervalo : '' })}
                />
                <span className="text-sm font-medium text-slate-700">Houve intervalo?</span>
              </label>
            </div>

            {form.houveIntervalo && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Duração do Intervalo</span>
                <TimeInput
                  value={form.duracaoIntervalo}
                  onChange={(v) => onChange({ duracaoIntervalo: v })}
                />
                {form.duracaoIntervalo && duracaoLabel(form.duracaoIntervalo) && (
                  <span className="text-sm font-semibold" style={{ color: '#9B003C' }}>
                    {duracaoLabel(form.duracaoIntervalo)}
                  </span>
                )}
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
