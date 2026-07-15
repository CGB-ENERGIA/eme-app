import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FormularioEME } from '../types/eme'
import type { AcionamentoData } from '../types/acionamento'
import { criarFormularioVazio, type EvidenciaItem } from '../types/eme'
import { emptyAcionamento } from '../types/acionamento'
import { logError } from '../utils/telemetry'
import { syncFormulario, excluirFormularioSupabase } from '../lib/supabase'

interface AcionamentoRecord {
  name: string          // nome do PDF — chave primária
  data: AcionamentoData
  pdfBytes: Uint8Array  // bytes do PDF original
  savedAt: string
}

interface EmeDB extends DBSchema {
  formularios: {
    key: string
    value: FormularioEME
    indexes: { 'por-data': string; 'por-status': string }
  }
  acionamentos: {
    key: string          // name do PDF
    value: AcionamentoRecord
  }
}

let dbPromise: Promise<IDBPDatabase<EmeDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<EmeDB>('eme-db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('formularios', { keyPath: 'id' })
          store.createIndex('por-data', 'criadoEm')
          store.createIndex('por-status', 'status')
        }
        if (oldVersion < 2) {
          db.createObjectStore('acionamentos', { keyPath: 'name' })
        }
      },
    })
  }
  return dbPromise
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeEvidencias(value: unknown): EvidenciaItem[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const source = isRecordObject(item) ? item : {}
    return {
      descricao: typeof source.descricao === 'string' ? source.descricao : '',
      foto1: typeof source.foto1 === 'string' ? source.foto1 : null,
      foto2: typeof source.foto2 === 'string' ? source.foto2 : null,
    }
  })
}

function sanitizeFormulario(raw: unknown): FormularioEME {
  const base = criarFormularioVazio()
  const source = isRecordObject(raw) ? raw : {}
  return {
    ...base,
    ...source,
    id: typeof source.id === 'string' && source.id ? source.id : base.id,
    criadoEm: typeof source.criadoEm === 'string' && source.criadoEm ? source.criadoEm : base.criadoEm,
    atualizadoEm: typeof source.atualizadoEm === 'string' && source.atualizadoEm ? source.atualizadoEm : base.atualizadoEm,
    status: source.status === 'finalizado' ? 'finalizado' : 'rascunho',
    evidencias: sanitizeEvidencias(source.evidencias),
  }
}

function sanitizeAcionamentoRecord(raw: unknown, nameFallback: string): AcionamentoRecord {
  const source = isRecordObject(raw) ? raw : {}
  const data = isRecordObject(source.data) ? source.data : {}
  const bytes = source.pdfBytes instanceof Uint8Array
    ? source.pdfBytes
    : Array.isArray(source.pdfBytes)
      ? new Uint8Array(source.pdfBytes as number[])
      : new Uint8Array()
  return {
    name: typeof source.name === 'string' && source.name ? source.name : nameFallback,
    savedAt: typeof source.savedAt === 'string' && source.savedAt ? source.savedAt : new Date().toISOString(),
    pdfBytes: bytes,
    data: {
      ...emptyAcionamento,
      ...data,
      quebraProgramacao: data.quebraProgramacao === 'sim' || data.quebraProgramacao === 'nao' ? data.quebraProgramacao : '',
      fotoAcionamento: typeof data.fotoAcionamento === 'string' ? data.fotoAcionamento : null,
    },
  }
}

export async function salvarFormulario(form: FormularioEME): Promise<void> {
  const db = await getDB()
  const atualizado = { ...form, atualizadoEm: new Date().toISOString() }
  try {
    await db.put('formularios', atualizado)
  } catch (error) {
    logError(error, { scope: 'db', action: 'salvar-formulario', id: form.id })
    throw error
  }
  // Sync remoto em background — não bloqueia a UI
  syncFormulario(atualizado).catch((err) =>
    logError(err, { scope: 'supabase', action: 'sync-formulario', id: form.id })
  )
}

export async function buscarFormulario(id: string): Promise<FormularioEME | undefined> {
  const db = await getDB()
  try {
    const raw = await db.get('formularios', id)
    return raw ? sanitizeFormulario(raw) : undefined
  } catch (error) {
    logError(error, { scope: 'db', action: 'buscar-formulario', id })
    return undefined
  }
}

export async function listarFormularios(): Promise<FormularioEME[]> {
  const db = await getDB()
  try {
    const todos = await db.getAll('formularios')
    return todos.map(sanitizeFormulario).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  } catch (error) {
    logError(error, { scope: 'db', action: 'listar-formularios' })
    return []
  }
}

export async function excluirFormulario(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('formularios', id)
  excluirFormularioSupabase(id).catch((err) =>
    logError(err, { scope: 'supabase', action: 'excluir-formulario', id })
  )
}

// ── Acionamentos ─────────────────────────────────────────────

export async function salvarAcionamento(record: AcionamentoRecord): Promise<void> {
  const db = await getDB()
  try {
    await db.put('acionamentos', record)
  } catch (error) {
    logError(error, { scope: 'db', action: 'salvar-acionamento', name: record.name })
    throw error
  }
}

export async function buscarAcionamento(name: string): Promise<AcionamentoRecord | undefined> {
  const db = await getDB()
  try {
    const raw = await db.get('acionamentos', name)
    return raw ? sanitizeAcionamentoRecord(raw, name) : undefined
  } catch (error) {
    logError(error, { scope: 'db', action: 'buscar-acionamento', name })
    return undefined
  }
}

export async function listarAcionamentos(): Promise<AcionamentoRecord[]> {
  const db = await getDB()
  try {
    const todos = await db.getAll('acionamentos')
    return todos
      .map((record) => sanitizeAcionamentoRecord(record, 'sem-nome'))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  } catch (error) {
    logError(error, { scope: 'db', action: 'listar-acionamentos' })
    return []
  }
}

export async function excluirAcionamento(name: string): Promise<void> {
  const db = await getDB()
  await db.delete('acionamentos', name)
}
