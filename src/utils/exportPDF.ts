import jsPDF from 'jspdf'
import type { FormularioEME } from '../types/eme'

// ── Carrega o PNG do favicon como base64 ──────────────────────
let _logoCache: string | null = null
async function getLogoBase64(): Promise<string | null> {
  if (_logoCache) return _logoCache
  try {
    const res  = await fetch('/favicon.png')
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload  = () => { _logoCache = reader.result as string; resolve(_logoCache) }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// ─── Paleta CGB ───────────────────────────────────────────────
const CGB = {
  dark:   [123,  0, 41] as [number,number,number],   // #7B0029
  main:   [192,  1, 74] as [number,number,number],   // #C0014A
  light:  [255, 240, 244] as [number,number,number], // #FFF0F4
  mid:    [248, 220, 230] as [number,number,number], // divisor suave
  white:  [255, 255, 255] as [number,number,number],
  ink:    [ 30,  41,  59] as [number,number,number], // slate-800
  muted:  [100, 116, 139] as [number,number,number], // slate-500
  faint:  [241, 245, 249] as [number,number,number], // slate-100
  border: [226, 232, 240] as [number,number,number], // slate-200
  green:  [ 22, 163,  74] as [number,number,number], // #16A34A
}

const W = 210
const MX = 12          // margem horizontal
const COL = W - MX * 2
const PAGE_H = 297
const FOOTER_H = 10
const SAFE_BOTTOM = PAGE_H - FOOTER_H - 8

function fmt(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtHora(h: string) {
  if (!h) return '—'
  return h
}

function duracaoLabel(valor: string) {
  if (!valor) return '—'
  const [h, m] = valor.split(':').map(Number)
  const total = (h || 0) * 60 + (m || 0)
  if (!total) return '—'
  if (total < 60) return `${total} min`
  if (total % 60 === 0) return `${total / 60}h`
  return `${Math.floor(total / 60)}h ${total % 60}min`
}

function imageFormat(src: string): 'PNG' | 'JPEG' {
  return src.startsWith('data:image/png') ? 'PNG' : 'JPEG'
}

function addPdfImage(doc: jsPDF, src: string, x: number, y: number, w: number, h: number) {
  const primary = imageFormat(src)
  const fallback = primary === 'PNG' ? 'JPEG' : 'PNG'
  try {
    doc.addImage(src, primary, x, y, w, h)
  } catch {
    try { doc.addImage(src, fallback, x, y, w, h) } catch { /* ignorar imagem inválida */ }
  }
}

// ─── Helpers de desenho ───────────────────────────────────────

function headerPage(doc: jsPDF, logoBase64?: string | null) {
  // Fundo branco
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, 30, 'F')

  // Logo CGB — proporção vertical (~3:4) como na imagem original
  const logoH = 22
  const logoW = logoH * 0.75
  const logoX = MX
  const logoY = 3
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', logoX, logoY, logoW, logoH)
    } catch {
      drawCGBLogo(doc, logoX, logoY, logoH)
    }
  } else {
    drawCGBLogo(doc, logoX, logoY, logoH)
  }
  const logoSize = logoW

  // Texto CGB / ENGENHARIA ao lado da logo
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...CGB.dark)
  doc.text('CGB', logoX + logoSize + 4, 13)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CGB.main)
  doc.text('ENGENHARIA', logoX + logoSize + 4, 18)

  // Linha divisória vertical sutil entre a marca e o título
  doc.setDrawColor(...CGB.mid)
  doc.setLineWidth(0.3)
  doc.line(logoX + logoSize + 28, 6, logoX + logoSize + 28, 22)

  // Título à direita da divisória
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...CGB.dark)
  doc.text('FORMULÁRIO DE ATENDIMENTO EMERGENCIAL', logoX + logoSize + 32, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...CGB.muted)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, logoX + logoSize + 32, 18.5)

  // Faixa carmim grossa embaixo (identidade visual)
  doc.setFillColor(...CGB.main)
  doc.rect(0, 28, W, 3, 'F')
  doc.setFillColor(...CGB.dark)
  doc.rect(0, 31, W, 1, 'F')
}

// Logo CGB: hexágono alongado verticalmente dividido em 6 facetas
// com quadrado vazio no centro
function drawCGBLogo(doc: jsPDF, x: number, y: number, size: number) {
  const cx = x + size / 2
  const cy = y + size / 2
  // hexágono mais alto que largo (proporção da imagem ~3:4)
  const hw = size * 0.36   // meia-largura
  const hh = size * 0.50   // meia-altura

  // 6 vértices externos do hexágono
  const T  = [cx,      cy - hh]      // topo
  const TR = [cx + hw, cy - hh * 0.5]
  const BR = [cx + hw, cy + hh * 0.5]
  const B  = [cx,      cy + hh]      // base
  const BL = [cx - hw, cy + hh * 0.5]
  const TL = [cx - hw, cy - hh * 0.5]

  // 4 vértices do quadrado interno (rotacionado 45°)
  const sq = size * 0.18  // meia-diagonal do quadrado central
  const iT = [cx,      cy - sq]
  const iR = [cx + sq, cy]
  const iB = [cx,      cy + sq]
  const iL = [cx - sq, cy]

  // Pontas laterais do quadrado interno alinhadas com TR/BR/BL/TL
  // facetas alternam main (claro) e dark (escuro)
  const main = CGB.main
  const dark = CGB.dark

  const fill = (rgb: [number,number,number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2])

  // Topo esquerda (triângulo: T, iT, TL) — escuro
  fill(dark)
  doc.triangle(T[0], T[1], iT[0], iT[1], TL[0], TL[1], 'F')

  // Topo direita (triângulo: T, TR, iT) — escuro
  doc.triangle(T[0], T[1], TR[0], TR[1], iT[0], iT[1], 'F')

  // Lateral direita superior (TR, iR, iT) — claro
  fill(main)
  doc.triangle(TR[0], TR[1], iR[0], iR[1], iT[0], iT[1], 'F')

  // Lateral direita inferior (TR, BR, iR) — claro
  doc.triangle(TR[0], TR[1], BR[0], BR[1], iR[0], iR[1], 'F')

  // Base direita (BR, iB, iR) — escuro
  fill(dark)
  doc.triangle(BR[0], BR[1], iB[0], iB[1], iR[0], iR[1], 'F')

  // Base esquerda (BR, B, iB) — escuro
  doc.triangle(BR[0], BR[1], B[0], B[1], iB[0], iB[1], 'F')

  // Base canto esquerdo (B, BL, iB) — escuro
  doc.triangle(B[0], B[1], BL[0], BL[1], iB[0], iB[1], 'F')

  // Lateral esquerda inferior (BL, iL, iB) — claro
  fill(main)
  doc.triangle(BL[0], BL[1], iL[0], iL[1], iB[0], iB[1], 'F')

  // Lateral esquerda superior (BL, TL, iL) — claro
  doc.triangle(BL[0], BL[1], TL[0], TL[1], iL[0], iL[1], 'F')

  // Topo canto esquerdo (TL, iT, iL) — escuro
  fill(dark)
  doc.triangle(TL[0], TL[1], iT[0], iT[1], iL[0], iL[1], 'F')
}

function drawFooter(doc: jsPDF, page: number, total: number) {
  const y = PAGE_H - 7
  doc.setDrawColor(...CGB.mid)
  doc.setLineWidth(0.3)
  doc.line(MX, y - 2, W - MX, y - 2)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CGB.muted)
  doc.text('CGB Engenharia  —  Formulário de Atendimento Emergencial', MX, y)
  doc.text(`Pág. ${page} / ${total}`, W - MX, y, { align: 'right' })
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  // Fundo suave com borda esquerda carmim
  doc.setFillColor(...CGB.light)
  doc.roundedRect(MX, y, COL, 8, 1, 1, 'F')
  doc.setFillColor(...CGB.main)
  doc.rect(MX, y, 2, 8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...CGB.dark)

  doc.text(title.toUpperCase(), MX + 6, y + 5.5)

  return y + 12
}

function fieldLabel(doc: jsPDF, label: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...CGB.muted)

  doc.text(label.toUpperCase(), x, y)

}


function infoBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(...CGB.faint)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F')
  doc.setDrawColor(...CGB.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'S')
}

function pill(doc: jsPDF, label: string, x: number, y: number, filled = false, fillColor?: [number,number,number]) {
  const tw = doc.getTextWidth(label) + 6
  if (filled) {
    doc.setFillColor(...(fillColor ?? CGB.main))
    doc.roundedRect(x, y - 3.5, tw, 5.5, 1.5, 1.5, 'F')
    doc.setTextColor(...CGB.white)
  } else {
    doc.setFillColor(...CGB.light)
    doc.roundedRect(x, y - 3.5, tw, 5.5, 1.5, 1.5, 'F')
    doc.setTextColor(...CGB.dark)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(label, x + 3, y + 0.5)
  doc.setTextColor(...CGB.ink)
  return tw + 3
}

// ─── Exportação principal ─────────────────────────────────────

export async function exportarPDF(form: FormularioEME): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 36
  let page = 1

  // Carrega logo antes de começar
  const logoBase64 = await getLogoBase64()

  const checkPage = (needed = 25) => {
    if (y + needed > SAFE_BOTTOM) {
      drawFooter(doc, page, 99) // placeholder
      doc.addPage()
      page++
      y = 14
    }
  }

  // ── Página 1 header ──────────────────────────────────────────
  headerPage(doc, logoBase64)

  // ── STATUS BADGE ─────────────────────────────────────────────
  pill(doc, form.status === 'finalizado' ? 'CONCLUIDO' : 'RASCUNHO', MX, y, form.status === 'finalizado', form.status === 'finalizado' ? CGB.green : undefined)
  y += 8

  // ── DADOS DO INCIDENTE ───────────────────────────────────────
  y = sectionTitle(doc, 'Dados do Incidente', y)

  // Incidente (destaque)
  infoBox(doc, MX, y, COL, 14)
  fieldLabel(doc, 'Incidente / Ocorrência', MX + 4, y + 4)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...CGB.dark)
  const incLines = doc.splitTextToSize(form.incidente || '—', COL - 8)
  doc.text(incLines, MX + 4, y + 10)
  y += 14 + incLines.length * 2 + 3

  // Grid 2 colunas: Base | Município
  const half = (COL - 4) / 2
  infoBox(doc, MX, y, half, 13)
  infoBox(doc, MX + half + 4, y, half, 13)
  fieldLabel(doc, 'Base', MX + 3, y + 4)
  fieldLabel(doc, 'Município', MX + half + 7, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CGB.ink)
  doc.text(form.base || '—', MX + 3, y + 10)
  doc.text(form.municipio || '—', MX + half + 7, y + 10)
  y += 17

  // Grid 2 colunas: Data Início | Data Final
  infoBox(doc, MX, y, half, 13)
  infoBox(doc, MX + half + 4, y, half, 13)
  fieldLabel(doc, 'Data Início', MX + 3, y + 4)
  fieldLabel(doc, 'Data Final', MX + half + 7, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CGB.ink)
  doc.text(fmt(form.dataInicio), MX + 3, y + 10)
  doc.text(fmt(form.dataFinal), MX + half + 7, y + 10)
  y += 17

  // Equipe
  infoBox(doc, MX, y, COL, 13)
  fieldLabel(doc, 'Equipe', MX + 3, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CGB.ink)
  const eqLines = doc.splitTextToSize(form.equipe || '—', COL - 6)
  doc.text(eqLines, MX + 3, y + 10)
  y += Math.max(13, eqLines.length * 5 + 6) + 3

  // Supervisor
  checkPage(16)
  infoBox(doc, MX, y, COL, 13)
  fieldLabel(doc, 'Supervisor', MX + 3, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CGB.ink)
  doc.text(form.supervisor || '—', MX + 3, y + 10)
  y += 17

  // ── INFORMAÇÕES DE ACIONAMENTO ───────────────────────────────
  checkPage(50)
  y = sectionTitle(doc, 'Informações de Acionamento', y)

  const labelH  = 14
  const labelOY = 4.5

  const fmtDateTimeLocal = (v: string) => {
    if (!v) return ''
    try {
      const d = new Date(v)
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return v }
  }

  const drawCell = (rx: number, ry: number, rw: number, rh: number, label: string, value?: string) => {
    doc.setDrawColor(...CGB.border)
    doc.setLineWidth(0.3)
    doc.rect(rx, ry, rw, rh, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...CGB.dark)
    doc.text(label, rx + 2.5, ry + labelOY)
    if (value && value.trim()) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...CGB.ink)
      doc.text(value, rx + 2.5, ry + rh - 3.5)
    } else {
      doc.setDrawColor(200, 210, 220)
      doc.setLineWidth(0.2)
      doc.line(rx + 2.5, ry + rh - 4, rx + rw - 2.5, ry + rh - 4)
    }
  }

  // Linha 1: Responsável EQTL Acionamento | VIA
  const respW = COL * 0.65
  const viaW  = COL - respW
  const yLinha1 = y
  drawCell(MX,           y, respW, labelH, 'RESPONSÁVEL EQTL ACIONAMENTO:', form.acionamentoResponsavelEqtl || undefined)
  drawCell(MX + respW,   y, viaW,  labelH, 'VIA:', form.acionamentoVia || undefined)
  y += labelH

  // Linha 2: Acionamento (data/hora) | Chegada na Base (data/hora)
  const halfRow = COL / 2
  const yLinha2 = y
  const acionamentoFmt = fmtDateTimeLocal(form.acionamentoDataHora)
  const chegadaBaseFmt = fmtDateTimeLocal(form.acionamentoChegadaBase)
  drawCell(MX,            y, halfRow, labelH, 'ACIONAMENTO:', acionamentoFmt || undefined)
  drawCell(MX + halfRow,  y, halfRow, labelH, 'CHEGADA NA BASE:', chegadaBaseFmt || undefined)
  y += labelH

  // Linha 3: Houve Quebra de Programação?
  const pepRowH = labelH + 6
  const yLinha3 = y
  const quebraVal = form.acionamentoQuebraProgramacao
  const quebraTexto = quebraVal === 'sim'
    ? `Sim${form.acionamentoPep ? `  —  PEP: ${form.acionamentoPep}` : ''}`
    : quebraVal === 'nao' ? 'Não' : undefined
  drawCell(MX, y, COL, pepRowH, 'HOUVE QUEBRA DE PROGRAMAÇÃO? SE SIM, COLOQUE O PEP:', quebraTexto)

  y += pepRowH + 4

  // Coordenadas das células de acionamento (metadata gravado ao final do PDF)
  const acionamentoCoords = [yLinha1, yLinha2, yLinha3, respW, halfRow, labelH, pepRowH, MX, COL, PAGE_H].join(',')

  // ── INTERVALO E ENERGIZAÇÃO ──────────────────────────────────
  if (form.horaEnergizacao) {
    checkPage(30)
    y = sectionTitle(doc, 'Intervalo e Energização', y)

    const tercW = (COL - 8) / 3

    const boxes = [
      { label: 'Hora de Energização', value: fmtHora(form.horaEnergizacao) },
      { label: 'Houve Intervalo?',     value: form.houveIntervalo ? 'Sim' : 'Não' },
      { label: 'Duração do Intervalo', value: form.houveIntervalo ? duracaoLabel(form.duracaoIntervalo) : '—' },
    ]

    for (const [i, box] of boxes.entries()) {
      const bx = MX + i * (tercW + 4)
      infoBox(doc, bx, y, tercW, 18)
      fieldLabel(doc, box.label, bx + 3, y + 5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(i === 0 ? CGB.dark[0] : CGB.ink[0], i === 0 ? CGB.dark[1] : CGB.ink[1], i === 0 ? CGB.dark[2] : CGB.ink[2])
      doc.text(box.value, bx + 3, y + 14)
    }
    y += 23
  }

  // ── QUEBRA DE PÁGINA: página 2 começa com Fotos ───────────────
  doc.addPage()
  page++
  const fotosPageNum = page
  y = 14

  // ── FOTOS DO SERVIÇO ─────────────────────────────────────────
  checkPage(30)
  y = sectionTitle(doc, 'Fotos do Serviço', y)

  const fotoW = (COL - 4) / 2
  const fotoH = fotoW * 0.72

  const fotasFixas = [
    { label: 'Acionamento',                           src: form.fotoAcionamento },
    { label: 'Chegada da equipe na base',             src: form.fotoChegadaBase },
    { label: 'Saída da equipe da base',               src: form.fotoSaidaBase },
    { label: 'Chegada da equipe no local de serviço', src: form.fotoChegadaServico },
    { label: 'Chegada da equipe na base pós atendimento', src: form.fotoChegadaBasePosAtendimento },
    { label: 'Foto da Energização do Sistema',        src: form.fotoEnergizacao },
  ]

  let col2 = false
  let rowStartY = y
  let fotoAcionamentoRect = ''

  for (const foto of fotasFixas) {
    if (!foto.src && foto.label !== 'Acionamento') continue
    checkPage(fotoH + 16)
    const fx = col2 ? MX + fotoW + 4 : MX
    if (!col2) rowStartY = y

    // Moldura
    doc.setFillColor(...CGB.faint)
    doc.roundedRect(fx, rowStartY, fotoW, fotoH + 8, 2, 2, 'F')
    doc.setDrawColor(...CGB.border)
    doc.setLineWidth(0.2)
    doc.roundedRect(fx, rowStartY, fotoW, fotoH + 8, 2, 2, 'S')

    if (foto.label === 'Acionamento') {
      fotoAcionamentoRect = [fotosPageNum, fx + 1, rowStartY + 1, fotoW - 2, fotoH - 1].join(',')
    }

    if (foto.src) {
      addPdfImage(doc, foto.src, fx + 1, rowStartY + 1, fotoW - 2, fotoH - 1)
    } else {
      // Placeholder para foto pendente
      doc.setFillColor(230, 230, 235)
      doc.roundedRect(fx + 1, rowStartY + 1, fotoW - 2, fotoH - 1, 1.5, 1.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 170)
      doc.text('Foto a ser inserida', fx + fotoW / 2, rowStartY + fotoH / 2 - 2, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text('(preenchido posteriormente)', fx + fotoW / 2, rowStartY + fotoH / 2 + 4, { align: 'center' })
    }

    // Label abaixo da foto
    doc.setFillColor(...CGB.dark)
    doc.rect(fx + 1, rowStartY + fotoH, fotoW - 2, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...CGB.white)
    const lbl = doc.splitTextToSize(foto.label, fotoW - 6)
    doc.text(lbl[0], fx + fotoW / 2, rowStartY + fotoH + 4.5, { align: 'center' })

    if (col2) y = rowStartY + fotoH + 10
    col2 = !col2
  }
  if (col2) y = rowStartY + fotoH + 10
  y += 4

  // ── QUEBRA DE PÁGINA: página 3 começa com Evidências ─────────
  doc.addPage()
  page++
  y = 14

  // ── EVIDÊNCIAS ───────────────────────────────────────────────
  const evidencias = form.evidencias.filter(e => e.descricao || e.foto1 || e.foto2)
  if (evidencias.length > 0) {
    checkPage(30)
    y = sectionTitle(doc, 'Evidências', y)

    for (const [idx, ev] of form.evidencias.entries()) {
      if (!ev.descricao && !ev.foto1 && !ev.foto2) continue
      const evH = 8 + (ev.descricao ? 10 : 0) + (ev.foto1 || ev.foto2 ? fotoH + 14 : 0)
      checkPage(evH + 8)

      // Card da evidência
      doc.setFillColor(...CGB.white)
      doc.setDrawColor(...CGB.border)
      doc.setLineWidth(0.3)
      doc.roundedRect(MX, y, COL, evH, 2, 2, 'FD')
      // Barra lateral carmim
      doc.setFillColor(...CGB.main)
      doc.roundedRect(MX, y, 3, evH, 1, 1, 'F')

      // Número da evidência
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...CGB.dark)
      doc.text(`EVIDÊNCIA ${idx + 1}`, MX + 7, y + 5.5)
      let iy = y + 10

      if (ev.descricao) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...CGB.ink)
        const dl = doc.splitTextToSize(ev.descricao, COL - 12)
        doc.text(dl, MX + 7, iy)
        iy += dl.length * 5 + 2
      }

      const evFotoW = (COL - 16) / 2
      const evFotoH = evFotoW * 0.72

      const evFotos = [
        { src: ev.foto1, lbl: 'Foto do Defeito' },
        { src: ev.foto2, lbl: 'Foto da Correção' },
      ].filter((f): f is { src: string; lbl: string } => !!f.src)

      for (const [fi, { src, lbl }] of evFotos.entries()) {
        const fx = MX + 7 + fi * (evFotoW + 4)

        doc.setFillColor(...CGB.faint)
        doc.roundedRect(fx, iy, evFotoW, evFotoH + 7, 1.5, 1.5, 'F')
        addPdfImage(doc, src, fx + 1, iy + 1, evFotoW - 2, evFotoH - 1)

        doc.setFillColor(...CGB.dark)
        doc.rect(fx + 1, iy + evFotoH, evFotoW - 2, 6, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6)
        doc.setTextColor(...CGB.white)
        doc.text(lbl, fx + evFotoW / 2, iy + evFotoH + 4, { align: 'center' })
      }

      if (evFotos.length > 0) iy += evFotoH + 10

      y += evH + 5
    }
  }

  // ── OBSERVAÇÃO ───────────────────────────────────────────────
  if (form.observacao) {
    checkPage(24)
    y = sectionTitle(doc, 'Observação / Informações Adicionais', y)
    const obsLines = doc.splitTextToSize(form.observacao, COL - 8)
    const obsH = obsLines.length * 5 + 8
    infoBox(doc, MX, y, COL, obsH)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...CGB.ink)
    doc.text(obsLines, MX + 4, y + 6)
    y += obsH + 4
  }

  // ── RODAPÉ EM TODAS AS PÁGINAS ───────────────────────────────
  // Metadata para o editor de acionamento (células + slot exato da foto)
  const subjectParts = [`EME-ACIONAMENTO:${acionamentoCoords}`]
  if (fotoAcionamentoRect) subjectParts.push(`FOTO-AC:${fotoAcionamentoRect}`)
  doc.setProperties({ subject: subjectParts.join('|') })

  const totalPages = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, p, totalPages)
  }

  const nome = `EME_${form.incidente || form.id.slice(0, 8)}_${fmt(form.dataInicio).replace(/\//g, '-')}.pdf`
  doc.save(nome)
}
