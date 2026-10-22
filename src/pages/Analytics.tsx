import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Share2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { listarFormularios } from '../store/db'
import type { FormularioEME } from '../types/eme'

const BASES = ['Bacabal', 'Santa Inês', 'Itapecuru Mirim', 'Pedreiras', 'Presidente Dutra', 'Barra do Corda']
const COLORS = ['#C0014A', '#7B0029', '#E74C3C', '#27AE60', '#2980B9', '#F39C12']

interface ChartData {
  base: string
  quantidade: number
  color: string
}

export default function Analytics() {
  const navigate = useNavigate()
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const formularios = await listarFormularios()
        const contagem: Record<string, number> = {}

        BASES.forEach(base => {
          contagem[base] = 0
        })

        formularios.forEach((form: FormularioEME) => {
          if (form.base && contagem.hasOwnProperty(form.base)) {
            contagem[form.base]++
          }
        })

        const chartData = BASES.map((base, idx) => ({
          base,
          quantidade: contagem[base] || 0,
          color: COLORS[idx],
        }))

        setData(chartData)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const total = data.reduce((sum, item) => sum + item.quantidade, 0)

  const handleShare = async () => {
    setSharing(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const chartElement = document.getElementById('chart-container')
      if (!chartElement) return

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#0d0f16',
        scale: 2,
        allowTaint: true,
        useCORS: true,
        logging: false,
      })

      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'analytics.png', { type: 'image/png' })

        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Dashboard EME - Utilização por Base',
            })
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              downloadImage(canvas)
            }
          }
        } else {
          downloadImage(canvas)
        }
      })
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
      alert('Erro ao gerar imagem. Tente novamente.')
    } finally {
      setSharing(false)
    }
  }

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard-eme.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <AppShell page="analytics">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#C0014A' }}></div>
            <p className="mt-4 text-slate-400">Carregando dados...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell page="analytics">
      <div className="w-full min-h-screen" style={{ background: '#0d0f16' }}>
        {/* Header */}
        <div className="relative w-full px-3 sm:px-4 md:px-6 lg:px-8 pt-5 sm:pt-6 lg:pt-8 pb-6 sm:pb-8 lg:pb-10 border-b" style={{ borderColor: 'rgba(192,1,74,0.15)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 120% at 50% -10%, rgba(192,1,74,0.2) 0%, transparent 65%)'
          }} />

          <div className="relative flex items-center justify-between gap-4">
            <button
              onClick={() => navigate('/lista')}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-light-sweep font-black text-2xl sm:text-3xl lg:text-4xl leading-tight tracking-widest uppercase">
                Utilização
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard de uso por base</p>
            </div>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)', color: '#fff' }}
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-6xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl p-6" style={{ background: 'rgba(192,1,74,0.1)', border: '1px solid rgba(192,1,74,0.2)' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>Total de Formulários</p>
              <p className="text-4xl font-black mt-2" style={{ color: '#C0014A' }}>{total}</p>
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'rgba(192,1,74,0.05)', border: '1px solid rgba(192,1,74,0.15)' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>Bases Ativas</p>
              <p className="text-4xl font-black mt-2" style={{ color: '#E0E7FF' }}>{data.filter(d => d.quantidade > 0).length}</p>
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'rgba(192,1,74,0.05)', border: '1px solid rgba(192,1,74,0.15)' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>Média por Base</p>
              <p className="text-4xl font-black mt-2" style={{ color: '#E0E7FF' }}>{(total / BASES.length).toFixed(1)}</p>
            </div>
          </div>

          {/* Chart */}
          <div
            id="chart-container"
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: '#0d0f16',
              border: '1px solid rgba(255,255,255,0.1)',
              width: '100%'
            }}
          >
            <h2 className="text-xl font-bold mb-6" style={{ color: '#f1f5f9' }}>Formulários por Base</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                <XAxis
                  dataKey="base"
                  stroke="#808080"
                  style={{ fontSize: 12, fontWeight: 600 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#808080" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #C0014A',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value) => [value, 'Formulários']}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="quantidade" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Table */}
          <div className="mt-8 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <table className="w-full">
              <thead style={{ background: 'rgba(192,1,74,0.1)' }}>
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>Base</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>Formulários</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>Percentual</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.base} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-4 sm:px-6 py-4 flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-slate-200">{item.base}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right text-sm font-bold" style={{ color: item.color }}>
                      {item.quantidade}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right text-sm text-slate-400">
                      {total > 0 ? ((item.quantidade / total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
