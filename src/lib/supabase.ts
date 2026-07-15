import { createClient } from '@supabase/supabase-js'
import type { FormularioEME, EvidenciaItem } from '../types/eme'
import { uploadFotosFormulario, isRemoteUrl } from './r2'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// ─── Conversão FormularioEME ↔ Supabase row ───────────────────

type Row = Record<string, unknown>

function toRow(form: FormularioEME): Row {
  return {
    id: form.id,
    criado_em: form.criadoEm,
    atualizado_em: form.atualizadoEm,
    status: form.status,
    incidente: form.incidente,
    base: form.base,
    municipio: form.municipio,
    data_inicio: form.dataInicio,
    data_final: form.dataFinal,
    equipe: form.equipe,
    supervisor: form.supervisor,
    horarios_atendimento: form.horariosAtendimento,
    houve_intervalo: form.houveIntervalo,
    duracao_intervalo: form.duracaoIntervalo,
    hora_energizacao: form.horaEnergizacao,
    observacao: form.observacao,
    evidencias: form.evidencias.map((ev) => ({
      descricao: ev.descricao,
      foto1: isRemoteUrl(ev.foto1) ? ev.foto1 : null,
      foto2: isRemoteUrl(ev.foto2) ? ev.foto2 : null,
    })),
    foto_acionamento: isRemoteUrl(form.fotoAcionamento) ? form.fotoAcionamento : null,
    foto_chegada_base: isRemoteUrl(form.fotoChegadaBase) ? form.fotoChegadaBase : null,
    foto_saida_base: isRemoteUrl(form.fotoSaidaBase) ? form.fotoSaidaBase : null,
    foto_chegada_servico: isRemoteUrl(form.fotoChegadaServico) ? form.fotoChegadaServico : null,
    foto_energizacao: isRemoteUrl(form.fotoEnergizacao) ? form.fotoEnergizacao : null,
    foto_chegada_base_pos_atendimento: isRemoteUrl(form.fotoChegadaBasePosAtendimento)
      ? form.fotoChegadaBasePosAtendimento
      : null,
    acionamento_responsavel_eqtl: form.acionamentoResponsavelEqtl,
    acionamento_via: form.acionamentoVia,
    acionamento_data_hora: form.acionamentoDataHora,
    acionamento_chegada_base: form.acionamentoChegadaBase,
    acionamento_quebra_programacao: form.acionamentoQuebraProgramacao,
    acionamento_pep: form.acionamentoPep,
  }
}

function fromRow(row: Row): FormularioEME {
  const evidencias = Array.isArray(row.evidencias)
    ? (row.evidencias as EvidenciaItem[])
    : []

  return {
    id: row.id as string,
    criadoEm: row.criado_em as string,
    atualizadoEm: row.atualizado_em as string,
    status: (row.status as 'rascunho' | 'finalizado') ?? 'rascunho',
    incidente: (row.incidente as string) ?? '',
    base: (row.base as string) ?? '',
    municipio: (row.municipio as string) ?? '',
    dataInicio: (row.data_inicio as string) ?? '',
    dataFinal: (row.data_final as string) ?? '',
    equipe: (row.equipe as string) ?? '',
    supervisor: (row.supervisor as string) ?? '',
    horariosAtendimento: (row.horarios_atendimento as FormularioEME['horariosAtendimento']) ?? [],
    houveIntervalo: (row.houve_intervalo as boolean) ?? false,
    duracaoIntervalo: (row.duracao_intervalo as string) ?? '',
    horaEnergizacao: (row.hora_energizacao as string) ?? '',
    observacao: (row.observacao as string) ?? '',
    evidencias,
    fotoAcionamento: (row.foto_acionamento as string | null) ?? null,
    fotoChegadaBase: (row.foto_chegada_base as string | null) ?? null,
    fotoSaidaBase: (row.foto_saida_base as string | null) ?? null,
    fotoChegadaServico: (row.foto_chegada_servico as string | null) ?? null,
    fotoEnergizacao: (row.foto_energizacao as string | null) ?? null,
    fotoChegadaBasePosAtendimento: (row.foto_chegada_base_pos_atendimento as string | null) ?? null,
    acionamentoResponsavelEqtl: (row.acionamento_responsavel_eqtl as string) ?? '',
    acionamentoVia: (row.acionamento_via as string) ?? '',
    acionamentoDataHora: (row.acionamento_data_hora as string) ?? '',
    acionamentoChegadaBase: (row.acionamento_chegada_base as string) ?? '',
    acionamentoQuebraProgramacao: (row.acionamento_quebra_programacao as '' | 'sim' | 'nao') ?? '',
    acionamentoPep: (row.acionamento_pep as string) ?? '',
  }
}

// ─── Upload das fotos locais (base64) para R2 ─────────────────

async function uploadFotosParaR2(form: FormularioEME): Promise<FormularioEME> {
  const fotosSimples: Record<string, string> = {}

  const campos = [
    'fotoAcionamento', 'fotoChegadaBase', 'fotoSaidaBase',
    'fotoChegadaServico', 'fotoEnergizacao', 'fotoChegadaBasePosAtendimento',
  ] as const

  for (const campo of campos) {
    const val = form[campo]
    if (val) fotosSimples[campo] = val
  }

  const urlsSimples = await uploadFotosFormulario(form.id, fotosSimples)

  const evidenciasComUrl = await Promise.all(
    form.evidencias.map(async (ev, i) => {
      const evFotos: Record<string, string> = {}
      if (ev.foto1) evFotos[`evidencia_${i}_foto1`] = ev.foto1
      if (ev.foto2) evFotos[`evidencia_${i}_foto2`] = ev.foto2
      const urls = await uploadFotosFormulario(form.id, evFotos)
      return {
        ...ev,
        foto1: urls[`evidencia_${i}_foto1`] ?? ev.foto1,
        foto2: urls[`evidencia_${i}_foto2`] ?? ev.foto2,
      }
    })
  )

  return {
    ...form,
    ...Object.fromEntries(campos.map((c) => [c, urlsSimples[c] ?? form[c]])),
    evidencias: evidenciasComUrl,
  }
}

// ─── Operações Supabase ───────────────────────────────────────

export async function syncFormulario(form: FormularioEME): Promise<void> {
  if (!supabase) return

  // Faz upload das fotos base64 para R2 antes de salvar no Supabase
  const formComUrls = await uploadFotosParaR2(form)
  const row = toRow(formComUrls)

  const { error } = await supabase
    .from('formularios')
    .upsert(row, { onConflict: 'id' })

  if (error) throw error
}

export async function listarFormulariosSupabase(): Promise<FormularioEME[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('formularios')
    .select('*')
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return (data ?? []).map(fromRow)
}

export async function excluirFormularioSupabase(id: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('formularios')
    .delete()
    .eq('id', id)

  if (error) throw error
}
