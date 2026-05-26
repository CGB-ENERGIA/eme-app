import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileDown, Loader2, Sun, Moon, X, Camera, ZoomIn, ZoomOut, Save, CheckCircle, Trash2 } from 'lucide-react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { useTheme } from '../contexts/ThemeContext'
import { salvarAcionamento, buscarAcionamento, listarAcionamentos, excluirAcionamento } from '../store/db'
import { type AcionamentoData, emptyAcionamento } from '../types/acionamento'

// ── helpers ──────────────────────────────────────────────────
function fmtDT(v: string) {
  if (!v) return ''
  try {
    const d = new Date(v)
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return v }
}

// ── sub-componentes ──────────────────────────────────────────
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
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900/30 transition"
    />
  )
}

function PhotoField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef  = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => onChange(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <>
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600 h-44 bg-slate-50">
          <img src={value} alt="Acionamento" className="w-full h-full object-cover" />
          <button type="button" onClick={() => onChange(null)}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 h-44 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-5">
            <button type="button" onClick={() => camRef.current?.click()}
              className="flex flex-col items-center gap-1.5" style={{ color: '#9B003C' }}>
              <div className="rounded-xl p-3" style={{ background: '#FFF0F4' }}><Camera size={22} /></div>
              <span className="text-xs font-semibold">Câmera</span>
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-1.5 text-slate-500">
              <div className="bg-slate-100 dark:bg-slate-600 rounded-xl p-3"><Upload size={22} /></div>
              <span className="text-xs font-semibold">Galeria</span>
            </button>
          </div>
        </div>
      )}
      <input ref={camRef}  type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
    </>
  )
}

// ── página principal ─────────────────────────────────────────
export default function Acionamento() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const [pdfBytes, setPdfBytes]     = useState<Uint8Array | null>(null)
  const [pdfPages, setPdfPages]     = useState<string[]>([])
  const [pdfName, setPdfName]       = useState('')
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [zoom, setZoom]             = useState(1)
  const [data, setData]             = useState<AcionamentoData>(emptyAcionamento)
  const [exporting, setExporting]   = useState(false)
  const [saveState, setSaveState]   = useState<'idle' | 'saving' | 'saved'>('idle')
  const [savedList, setSavedList]   = useState<{ name: string; savedAt: string }[]>([])
  const [showSavedList, setShowSavedList] = useState(false)

  const pdfInputRef = useRef<HTMLInputElement>(null)

  const recarregarLista = useCallback(async () => {
    const lista = await listarAcionamentos()
    setSavedList(lista.map(r => ({ name: r.name, savedAt: r.savedAt })))
  }, [])

  useEffect(() => { recarregarLista() }, [recarregarLista])

  const salvar = useCallback(async (name: string, d: AcionamentoData, bytes?: Uint8Array) => {
    setSaveState('saving')
    await salvarAcionamento({
      name,
      data: d,
      pdfBytes: bytes ?? pdfBytes ?? new Uint8Array(),
      savedAt: new Date().toISOString(),
    })
    await recarregarLista()
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }, [pdfBytes, recarregarLista])

  const set = (partial: Partial<AcionamentoData>) => {
    setData((prev) => {
      const updated = { ...prev, ...partial }
      if (pdfName) salvar(pdfName, updated)
      return updated
    })
  }

  // ── importar PDF ─────────────────────────────────────────
  const handlePdfImport = async (file: File) => {
    setLoadingPdf(true)
    const name = file.name
    setPdfName(name)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      // carrega dados salvos para esse PDF (se existir)
      const saved = await buscarAcionamento(name)
      if (saved) {
        setData(saved.data)
        setPdfBytes(new Uint8Array(bytes))
      } else {
        setData(emptyAcionamento)
        setPdfBytes(new Uint8Array(bytes))
        // salva o PDF imediatamente para ficar disponível na lista
        await salvarAcionamento({ name, data: emptyAcionamento, pdfBytes: new Uint8Array(bytes), savedAt: new Date().toISOString() })
        await recarregarLista()
      }
      await renderPages(new Uint8Array(bytes).buffer)
    } finally {
      setLoadingPdf(false)
    }
  }

  const renderPages = async (buffer: ArrayBuffer) => {
    // usa pdfjs via CDN worker para não precisar configurar bundler
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const pages: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width  = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      pages.push(canvas.toDataURL('image/jpeg', 0.92))
    }
    setPdfPages(pages)
  }

  // ── gerar PDF mesclado ───────────────────────────────────
  const handleExport = async () => {
    if (!pdfBytes) return
    setExporting(true)
    try {
      const pdfDoc  = await PDFDocument.load(new Uint8Array(pdfBytes))
      const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const pages   = pdfDoc.getPages()
      const page    = pages[0]
      const { height } = page.getSize()

      // Lê coordenadas reais gravadas no metadata pelo exportPDF.ts
      const subject = pdfDoc.getSubject() ?? ''
      const match   = subject.match(/EME-ACIONAMENTO:(.+)/)
      if (!match) {
        alert('Este PDF não é compatível com o editor de acionamento. Gere um novo PDF pelo app.')
        return
      }

      const [y1, y2, y3, respW, halfRow, labelH, pepRowH, MX] =
        match[1].split(',').map(Number)

      // pdf-lib: origem no canto inferior esquerdo; jsPDF: origem no topo
      // conversão: ptY = (PAGE_H_mm - mmY) * pt_per_mm
      const PT = 2.8346  // pt por mm (72pt/inch ÷ 25.4mm/inch)
      // altura real da página em mm a partir do tamanho em pt
      const pageHmm = height / PT

      const mmToPageY = (mmFromTop: number, cellH: number) =>
        // posiciona o texto na linha de escrita: topo da célula + cellH - 4mm (acima da linha guia)
        (pageHmm - mmFromTop - cellH + 4) * PT

      const ink = rgb(0.12, 0.16, 0.23)

      const white = rgb(1, 1, 1)

      const writeCell = (text: string, xMm: number, yTopMm: number, cellH: number, maxWmm: number) => {
        if (!text) return
        const x    = xMm * PT
        const padX = 8   // mesmo recuo interno usado pelo jsPDF (MX + 3mm ≈ 8.5pt)
        const y    = mmToPageY(yTopMm, cellH)
        // cobre a linha guia com retângulo branco
        page.drawRectangle({
          x: x + padX - 2,
          y: y - 2,
          width: maxWmm * PT - padX,
          height: 3,
          color: white,
        })
        let t = text
        while (t.length > 1 && fontReg.widthOfTextAtSize(t, 9) > maxWmm * PT - padX - 4)
          t = t.slice(0, -1)
        page.drawText(t, { x: x + padX, y, size: 9, font: fontReg, color: ink })
      }

      // Linha 1
      writeCell(data.responsavelEqtl,        MX,           y1, labelH, respW)
      writeCell(data.via,                    MX + respW,   y1, labelH, 210 - MX * 2 - respW)

      // Linha 2
      writeCell(fmtDT(data.dataHoraAcionamento),  MX,            y2, labelH, halfRow)
      writeCell(fmtDT(data.dataHoraChegadaBase),  MX + halfRow,  y2, labelH, halfRow)

      // Linha 3
      const quebraTexto = data.quebraProgramacao === 'sim'
        ? `Sim${data.pep ? `  —  PEP: ${data.pep}` : ''}`
        : data.quebraProgramacao === 'nao' ? 'Não' : ''
      writeCell(quebraTexto, MX, y3, pepRowH, 210 - MX * 2)

      // Foto de acionamento — vai na página 2 (índice 1), primeira posição das fotos
      if (data.fotoAcionamento && pages.length >= 2) {
        try {
          const imgData  = data.fotoAcionamento.split(',')[1]
          const imgBytes = Uint8Array.from(atob(imgData), c => c.charCodeAt(0))
          const img = data.fotoAcionamento.startsWith('data:image/png')
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes)

          const page2 = pages[1]
          const { height: h2 } = page2.getSize()
          const pageHmm2 = h2 / PT

          // Coordenadas exatas do jsPDF para a primeira foto na página 2:
          // y=14 (margem p2) + 12 (sectionTitle) = 26 → checkPage não quebra → rowStartY=26
          // addImage: fx+1, rowStartY+1  →  x=MX+1, y=27
          const COL       = 210 - MX * 2
          const imgTopMm  = 14 + 12 + 1   // margem + título + padding top moldura
          const fotoW     = ((COL - 4) / 2) * PT
          const fotoH     = fotoW * 0.72 - PT
          const fotoX     = (MX + 1) * PT
          // pdf-lib Y = altura_página_pt - (topo_mm * PT) - fotoH
          const fotoY     = (pageHmm2 - imgTopMm) * PT - fotoH

          page2.drawImage(img, { x: fotoX, y: fotoY, width: fotoW - PT * 2, height: fotoH })
        } catch { /* ignora */ }
      }

      const mergedBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(mergedBytes)], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = pdfName.replace('.pdf', '') + '_acionamento.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  // ── drag & drop ──────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') handlePdfImport(file)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">

      {/* Header */}
      <div className="sticky top-0 z-40 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7B0029 0%, #C0014A 100%)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="p-1.5 -ml-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.12)' }}>
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: 'rgba(255,200,210,0.85)' }}>
              Editor de Acionamento
            </p>
            <p className="text-sm font-semibold truncate">
              {pdfName || 'Nenhum PDF importado'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saveState === 'saving' && <Loader2 size={14} className="animate-spin opacity-70" />}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-300">
                <CheckCircle size={13} /> Salvo
              </span>
            )}

            <button onClick={toggle} className="p-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {pdfBytes && (
              <>
                <button onClick={() => salvar(pdfName, data)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <Save size={14} /> Salvar
                </button>
                <button onClick={handleExport} disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ background: 'rgba(255,255,255,0.18)' }}>
                  {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  Exportar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-5 pb-10">

        {/* ── Sem PDF: área de importação ── */}
        {!pdfBytes && (
          <div className="space-y-5">
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => pdfInputRef.current?.click()}
              className="mt-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 py-16 cursor-pointer transition hover:border-pink-400"
              style={{ borderColor: '#E2C0CC' }}
            >
              {loadingPdf ? (
                <Loader2 size={36} className="animate-spin" style={{ color: '#C0014A' }} />
              ) : (
                <>
                  <div className="rounded-2xl p-5" style={{ background: '#FFF0F4' }}>
                    <Upload size={36} style={{ color: '#C0014A' }} />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-lg text-slate-700 dark:text-slate-200">
                      Importar PDF do formulário
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Clique ou arraste o PDF recebido no grupo
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Lista de registros salvos */}
            {savedList.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Rascunhos salvos
                  </p>
                  <button
                    onClick={() => setShowSavedList(v => !v)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
                  >
                    {showSavedList ? 'Ocultar' : 'Ver todos'}
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(showSavedList ? savedList : savedList.slice(0, 3)).map(({ name, savedAt }) => (
                    <div key={name} className="flex items-center justify-between px-5 py-3 gap-3">
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
                            setPdfBytes(new Uint8Array(record.pdfBytes))
                            await renderPages(new Uint8Array(record.pdfBytes).buffer)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition"
                          style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)' }}
                        >
                          <FileDown size={12} /> Abrir
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
          </div>
        )}
        <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfImport(f) }} />

        {/* ── Com PDF: layout duas colunas ── */}
        {pdfBytes && (
          <div className="flex flex-col lg:flex-row gap-5 mt-2">

            {/* Coluna esquerda: visualizador PDF */}
            <div className="flex-1 min-w-0">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">

                {/* toolbar do visualizador */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Visualização — {pdfPages.length} {pdfPages.length === 1 ? 'página' : 'páginas'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 transition">
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-xs font-bold text-slate-500 w-10 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button onClick={() => setZoom(z => Math.min(2.5, z + 0.25))}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 transition">
                      <ZoomIn size={14} />
                    </button>
                    <button onClick={() => { setPdfBytes(null); setPdfPages([]); setPdfName('') }}
                      className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 transition ml-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* páginas */}
                <div className="overflow-auto max-h-[75vh] bg-slate-200 dark:bg-slate-900 p-4 space-y-4">
                  {loadingPdf && (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={28} className="animate-spin" style={{ color: '#C0014A' }} />
                    </div>
                  )}
                  {pdfPages.map((src, i) => (
                    <img key={i} src={src} alt={`Página ${i + 1}`}
                      className="mx-auto shadow-xl rounded-lg block"
                      style={{ width: `${zoom * 100}%`, maxWidth: '100%' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna direita: formulário de acionamento */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4">

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
                <PhotoField value={data.fotoAcionamento}
                  onChange={(v) => set({ fotoAcionamento: v })} />
              </div>

              {/* Botão exportar */}
              <button onClick={handleExport} disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7B0029, #C0014A)', boxShadow: '0 8px 24px rgba(160,0,60,0.3)' }}>
                {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                Gerar PDF com Acionamento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
