import ExcelJS from 'exceljs'
import type { FormularioEME } from '../types/eme'

function fmt(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export async function exportarExcel(form: FormularioEME): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CGB Engenharia — EME App'
  wb.created = new Date()

  const ws = wb.addWorksheet('Atendimento Emergencial', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
  })

  ws.columns = [
    { width: 5 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
  ]

  const blueHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } } as ExcelJS.Fill
  const lightBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } as ExcelJS.Fill
  const white = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } } as ExcelJS.Fill
  const border: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  }

  // Title row
  ws.mergeCells('A1:F1')
  const titleRow = ws.getRow(1)
  titleRow.height = 32
  const titleCell = ws.getCell('A1')
  titleCell.value = 'FORMULÁRIO DE ATENDIMENTO EMERGENCIAL — CGB ENGENHARIA'
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = blueHeader
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Generated date
  ws.mergeCells('A2:F2')
  ws.getCell('A2').value = `Gerado em: ${new Date().toLocaleString('pt-BR')}`
  ws.getCell('A2').font = { size: 9, italic: true, color: { argb: 'FF64748B' } }
  ws.getCell('A2').alignment = { horizontal: 'right' }
  ws.getRow(2).height = 14

  const addSection = (title: string) => {
    ws.addRow([])
    const r = ws.lastRow!.number + 1
    ws.addRow([null, title.toUpperCase()])
    ws.mergeCells(`A${r}:F${r}`)
    const cell = ws.getCell(`A${r}`)
    cell.value = title.toUpperCase()
    cell.font = { bold: true, size: 9, color: { argb: 'FF1D4ED8' } }
    cell.fill = lightBlue
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    ws.getRow(r).height = 18
    return r
  }

  const addField = (label: string, value: string, col2?: string) => {
    const rn = ws.lastRow ? ws.lastRow.number + 1 : 4
    const row = ws.getRow(rn)
    row.height = 16

    ws.mergeCells(`B${rn}:C${rn}`)
    ws.getCell(`B${rn}`).value = label
    ws.getCell(`B${rn}`).font = { bold: true, size: 8, color: { argb: 'FF64748B' } }
    ws.getCell(`B${rn}`).fill = white

    if (col2) {
      ws.mergeCells(`D${rn}:E${rn}`)
      ws.getCell(`D${rn}`).value = value
      ws.getCell(`D${rn}`).font = { size: 9 }
      ws.getCell(`D${rn}`).fill = white
      ws.getCell(`D${rn}`).border = border
      ws.mergeCells(`F${rn}:F${rn}`)
      // col2 label
      ws.getCell(`B${rn}`).value = label
      ws.getCell(`D${rn}`).value = value
    } else {
      ws.mergeCells(`D${rn}:F${rn}`)
      ws.getCell(`D${rn}`).value = value
      ws.getCell(`D${rn}`).font = { size: 9 }
      ws.getCell(`D${rn}`).fill = white
      ws.getCell(`D${rn}`).border = border
    }
  }

  const addRow2 = (l1: string, v1: string, l2: string, v2: string) => {
    const rn = ws.lastRow ? ws.lastRow.number + 1 : 4
    const row = ws.getRow(rn)
    row.height = 16
    ws.getCell(`B${rn}`).value = l1
    ws.getCell(`B${rn}`).font = { bold: true, size: 8, color: { argb: 'FF64748B' } }
    ws.getCell(`C${rn}`).value = v1
    ws.getCell(`C${rn}`).font = { size: 9 }
    ws.getCell(`C${rn}`).border = border
    ws.getCell(`D${rn}`).value = l2
    ws.getCell(`D${rn}`).font = { bold: true, size: 8, color: { argb: 'FF64748B' } }
    ws.getCell(`E${rn}`).value = v2
    ws.getCell(`E${rn}`).font = { size: 9 }
    ws.getCell(`E${rn}`).border = border
  }

  // Section: Dados do Incidente
  addSection('Dados do Incidente')
  addField('Incidente', form.incidente)
  addRow2('Base', form.base, 'Município', form.municipio)
  addRow2('Data Início', fmt(form.dataInicio), 'Data Final', fmt(form.dataFinal))
  addField('Equipe', form.equipe)
  addField('Supervisor', form.supervisor)

  // Section: Horários
  addSection('Horários de Atendimento')
  form.horariosAtendimento.forEach((h, i) => {
    addField(`Período ${i + 1}${h.descricao ? ' — ' + h.descricao : ''}`, '')
    addRow2('Início', h.horaInicio || '—', 'Fim', h.horaFim || '—')
  })
  addRow2('Houve intervalo?', form.houveIntervalo ? 'Sim' : 'Não', 'Hora Energização', form.horaEnergizacao || '—')

  // Section: Observação
  if (form.observacao) {
    addSection('Observação / Informações Adicionais')
    const rn = ws.lastRow!.number + 1
    ws.mergeCells(`B${rn}:F${rn}`)
    const cell = ws.getCell(`B${rn}`)
    cell.value = form.observacao
    cell.font = { size: 9 }
    cell.alignment = { wrapText: true }
    cell.border = border
    ws.getRow(rn).height = Math.max(16, Math.ceil(form.observacao.length / 60) * 14)
  }

  // Section: Evidências
  addSection('Evidências')
  form.evidencias.forEach((ev, i) => {
    if (!ev.descricao && !ev.foto1 && !ev.foto2) return
    addField(`Evidência ${i + 1}`, ev.descricao || '—')
    const addPhoto = async (label: string, src: string | null) => {
      if (!src) return
      const rn = ws.lastRow!.number + 1
      ws.getRow(rn).height = 90
      ws.mergeCells(`B${rn}:F${rn}`)
      ws.getCell(`B${rn}`).value = label
      ws.getCell(`B${rn}`).font = { bold: true, size: 8, color: { argb: 'FF64748B' } }
      try {
        const base64 = src.split(',')[1]
        const ext = src.startsWith('data:image/png') ? 'png' : 'jpeg'
        const imgId = wb.addImage({ base64, extension: ext })
        ws.addImage(imgId, { tl: { col: 1, row: rn }, ext: { width: 180, height: 100 } })
      } catch {
        // ignore image errors
      }
    }
    addPhoto(`Evidência ${i + 1} — Antes`, ev.foto1)
    addPhoto(`Evidência ${i + 1} — Depois`, ev.foto2)
  })

  // Section: Fotos do Serviço
  addSection('Fotos do Serviço')
  const fotosServico = [
    { label: 'Chegada da equipe na base', src: form.fotoChegadaBase },
    { label: 'Saída da equipe da base', src: form.fotoSaidaBase },
    { label: 'Chegada da equipe no local de serviço', src: form.fotoChegadaServico },
    ...form.evidencias.flatMap((ev, i) => [
      { label: `Evidência ${i + 1} — Antes${ev.descricao ? ` (${ev.descricao})` : ''}`, src: ev.foto1 },
      { label: `Evidência ${i + 1} — Depois${ev.descricao ? ` (${ev.descricao})` : ''}`, src: ev.foto2 },
    ]),
  ]
  for (const f of fotosServico) {
    if (!f.src) continue
    const rn = ws.lastRow!.number + 1
    ws.getRow(rn).height = 100
    ws.mergeCells(`B${rn}:F${rn}`)
    ws.getCell(`B${rn}`).value = f.label
    ws.getCell(`B${rn}`).font = { bold: true, size: 8, color: { argb: 'FF64748B' } }
    try {
      const base64 = f.src.split(',')[1]
      const ext = f.src.startsWith('data:image/png') ? 'png' : 'jpeg'
      const imgId = wb.addImage({ base64, extension: ext })
      ws.addImage(imgId, { tl: { col: 1, row: rn }, ext: { width: 200, height: 110 } })
    } catch {
      // ignore image errors
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const nome = `EME_${form.incidente || form.id.slice(0, 8)}_${fmt(form.dataInicio).replace(/\//g, '-')}.xlsx`
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
