import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FormularioEME } from '../types/eme'
import type { AcionamentoData } from '../types/acionamento'
import { criarFormularioVazio, type EvidenciaItem } from '../types/eme'
import { emptyAcionamento } from '../types/acionamento'
import { logError } from '../utils/telemetry'
import { syncFormulario, excluirFormularioSupabase, listarFormulariosSupabase, buscarFormularioSupabase } from '../lib/supabase'

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

// Debounce por ID: evita chamadas repetidas ao Supabase enquanto o usuário digita
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>()
function debouncedSync(form: FormularioEME, delayMs = 2000) {
  const prev = syncTimers.get(form.id)
  if (prev) clearTimeout(prev)
  const timer = setTimeout(() => {
    syncTimers.delete(form.id)
    syncFormulario(form).catch((err) =>
      logError(err, { scope: 'supabase', action: 'sync-formulario', id: form.id })
    )
  }, delayMs)
  syncTimers.set(form.id, timer)
}

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
  // Sync remoto com debounce de 2s — evita chamadas repetidas enquanto o usuário digita
  debouncedSync(atualizado)
}

export async function buscarFormulario(id: string): Promise<FormularioEME | undefined> {
  const db = await getDB()
  try {
    const raw = await db.get('formularios', id)
    const local = raw ? sanitizeFormulario(raw) : undefined

    // Busca remoto para refletir edições feitas em outro dispositivo (campo ↔ escritório)
    try {
      const remoto = await buscarFormularioSupabase(id)
      if (remoto) {
        const clean = sanitizeFormulario(remoto)
        if (!local || clean.atualizadoEm >= local.atualizadoEm) {
          await db.put('formularios', clean)
          return clean
        }
      }
    } catch {
      /* offline — usa local */
    }

    return local
  } catch (error) {
    logError(error, { scope: 'db', action: 'buscar-formulario', id })
    return undefined
  }
}

export async function sincronizarDeSupabase(): Promise<FormularioEME[]> {
  try {
    const remotos = await listarFormulariosSupabase()
    if (remotos.length === 0) return []

    const db = await getDB()
    for (const remoto of remotos) {
      const local = await db.get('formularios', remoto.id)
      if (!local || remoto.atualizadoEm > local.atualizadoEm) {
        await db.put('formularios', sanitizeFormulario(remoto))
      }
    }

    const todos = await db.getAll('formularios')
    return todos.map(sanitizeFormulario).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  } catch (err) {
    logError(err, { scope: 'supabase', action: 'sincronizar-de-supabase' })
    return []
  }
}

/** Envia locais → Supabase e depois puxa atualizações remotas (botão Sync da PWA). */
export async function sincronizarTudo(): Promise<{ ok: boolean; total: number; enviados: number; erro?: string }> {
  if (!navigator.onLine) {
    return { ok: false, total: 0, enviados: 0, erro: 'Sem conexão. Tente novamente quando estiver online.' }
  }

  const db = await getDB()
  const locais = (await db.getAll('formularios')).map(sanitizeFormulario)
  let enviados = 0

  for (const form of locais) {
    try {
      await syncFormulario(form)
      enviados++
    } catch (err) {
      logError(err, { scope: 'supabase', action: 'sincronizar-tudo-push', id: form.id })
    }
  }

  const merged = await sincronizarDeSupabase()
  const total = merged.length > 0 ? merged.length : locais.length

  if (enviados === 0 && locais.length > 0) {
    return {
      ok: false,
      total,
      enviados,
      erro: 'Não foi possível enviar ao banco. Verifique a conexão e tente de novo.',
    }
  }

  return { ok: true, total, enviados }
}

export async function listarFormularios(): Promise<FormularioEME[]> {
  const db = await getDB()
  try {
    const todos = await db.getAll('formularios')
    const lista = todos.map(sanitizeFormulario).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

    // IndexedDB vazio: tenta popular do Supabase (ex: store limpo ou novo dispositivo)
    if (lista.length === 0) {
      return sincronizarDeSupabase()
    }

    return lista
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
