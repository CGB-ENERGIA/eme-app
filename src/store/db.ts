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

/** Dispara sempre que a contagem de formulários pendentes de sincronizar pode ter mudado —
 *  AppShell/Lista/Solicitações escutam para atualizar o indicador persistente na hora. */
export const EME_PENDING_EVENT = 'eme-pending-changed'
function notifyPendingChanged() {
  window.dispatchEvent(new CustomEvent(EME_PENDING_EVENT))
}

// Debounce por ID: evita chamadas repetidas ao Supabase enquanto o usuário digita
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>()
function debouncedSync(form: FormularioEME, delayMs = 2000) {
  const prev = syncTimers.get(form.id)
  if (prev) clearTimeout(prev)
  const timer = setTimeout(() => {
    syncTimers.delete(form.id)
    void (async () => {
      try {
        const comUrls = await syncFormulario(form)
        const db = await getDB()
        // Marca sincronizado e persiste URLs remotas (evita reupload e perda no próximo sync)
        await db.put('formularios', { ...comUrls, atualizadoEm: form.atualizadoEm, syncPendente: false })
        notifyPendingChanged()
      } catch (err) {
        // Fica marcado como pendente (já estava) — indicador na tela avisa o usuário
        logError(err, { scope: 'supabase', action: 'sync-formulario', id: form.id })
      }
    })()
  }, delayMs)
  syncTimers.set(form.id, timer)
}

/** Conta formulários com alterações locais que ainda não subiram ao banco. */
export async function contarFormulariosPendentes(): Promise<number> {
  const db = await getDB()
  const todos = await db.getAll('formularios')
  return todos.filter((f) => f.syncPendente).length
}

/** Leitura local (sem rede) — usado para refletir o status de sync de UM formulário na tela. */
export async function formularioSyncPendente(id: string): Promise<boolean> {
  const db = await getDB()
  const raw = await db.get('formularios', id)
  return !!raw?.syncPendente
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

const FOTO_CAMPOS = [
  'fotoAcionamento',
  'fotoSaidaBase',
  'fotoChegadaServico',
  'fotoEnergizacao',
  'fotoChegadaBasePosAtendimento',
] as const

/** Une dois formulários: base = mais recente, preenche fotos/evidências que estiverem vazias. */
function mergeFormularios(a: FormularioEME, b: FormularioEME): FormularioEME {
  const newer = a.atualizadoEm >= b.atualizadoEm ? a : b
  const older = newer === a ? b : a
  const merged: FormularioEME = { ...newer }

  for (const campo of FOTO_CAMPOS) {
    if (!merged[campo] && older[campo]) merged[campo] = older[campo]
  }

  const maxEv = Math.max(merged.evidencias.length, older.evidencias.length)
  if (maxEv > 0) {
    const evidencias = []
    for (let i = 0; i < maxEv; i++) {
      const n = merged.evidencias[i]
      const o = older.evidencias[i]
      if (!n && o) {
        evidencias.push(o)
      } else if (n && o) {
        evidencias.push({
          descricao: n.descricao || o.descricao,
          descricao2: n.descricao2 || o.descricao2,
          foto1: n.foto1 || o.foto1,
          foto2: n.foto2 || o.foto2,
        })
      } else if (n) {
        evidencias.push(n)
      }
    }
    merged.evidencias = evidencias
  }

  return merged
}

/** Cancela debounce e sincroniza agora (upload fotos + upsert). Atualiza IndexedDB com URLs. */
export async function sincronizarFormularioAgora(form: FormularioEME): Promise<FormularioEME> {
  const prev = syncTimers.get(form.id)
  if (prev) {
    clearTimeout(prev)
    syncTimers.delete(form.id)
  }

  const db = await getDB()
  const atualizado = { ...form, atualizadoEm: new Date().toISOString(), syncPendente: true }
  await db.put('formularios', atualizado)
  notifyPendingChanged()

  const comUrls = await syncFormulario(atualizado)
  const salvo = { ...comUrls, atualizadoEm: new Date().toISOString(), syncPendente: false }
  await db.put('formularios', salvo)
  notifyPendingChanged()
  return salvo
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
      descricao2: typeof source.descricao2 === 'string' ? source.descricao2 : '',
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
    syncPendente: source.syncPendente === true,
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
  const atualizado = { ...form, atualizadoEm: new Date().toISOString(), syncPendente: true }
  try {
    await db.put('formularios', atualizado)
  } catch (error) {
    logError(error, { scope: 'db', action: 'salvar-formulario', id: form.id })
    throw error
  }
  notifyPendingChanged()
  // Sync remoto com debounce de 2s — evita chamadas repetidas enquanto o usuário digita
  debouncedSync(atualizado)
}

export async function buscarFormulario(id: string): Promise<FormularioEME | undefined> {
  const db = await getDB()
  try {
    const raw = await db.get('formularios', id)
    const local = raw ? sanitizeFormulario(raw) : undefined

    try {
      const remoto = await buscarFormularioSupabase(id)
      if (remoto) {
        const clean = sanitizeFormulario(remoto)
        const merged = local ? mergeFormularios(local, clean) : clean
        await db.put('formularios', merged)
        return merged
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
      const localRaw = await db.get('formularios', remoto.id)
      const local = localRaw ? sanitizeFormulario(localRaw) : undefined
      const clean = sanitizeFormulario(remoto)
      const merged = local ? mergeFormularios(local, clean) : clean
      await db.put('formularios', merged)
    }

    const todos = await db.getAll('formularios')
    return todos.map(sanitizeFormulario).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  } catch (err) {
    logError(err, { scope: 'supabase', action: 'sincronizar-de-supabase' })
    return []
  }
}

type SyncResult = { ok: boolean; total: number; enviados: number; erro?: string }

/** Evita sync paralelo (botão Sync + auto-sync ao reconectar). */
let syncEmAndamento: Promise<SyncResult> | null = null

/** Envia locais → Supabase (com fotos) e depois puxa atualizações remotas.
 *  onProgress(enviados, total) — permite à UI mostrar uma barra/contador de progresso. */
export async function sincronizarTudo(onProgress?: (enviados: number, total: number) => void): Promise<SyncResult> {
  if (syncEmAndamento) return syncEmAndamento

  syncEmAndamento = (async (): Promise<SyncResult> => {
    if (!navigator.onLine) {
      return { ok: false, total: 0, enviados: 0, erro: 'Sem conexão. Tente novamente quando estiver online.' }
    }

    const db = await getDB()
    const locais = (await db.getAll('formularios')).map(sanitizeFormulario)
    // Só reenvia quem tem alteração pendente — evita reupload/upsert de formulários
    // já sincronizados a cada toque em "Sincronizar" (fotos já enviadas são baratas
    // de pular, mas o upsert de metadados no Supabase não precisa repetir à toa).
    const pendentes = locais.filter((f) => f.syncPendente)
    let enviados = 0
    let ultimoErro: string | undefined

    for (const form of pendentes) {
      try {
        const comUrls = await syncFormulario(form)
        await db.put('formularios', { ...comUrls, atualizadoEm: form.atualizadoEm, syncPendente: false })
        enviados++
      } catch (err) {
        ultimoErro = err instanceof Error ? err.message : 'Erro ao sincronizar'
        logError(err, { scope: 'supabase', action: 'sincronizar-tudo-push', id: form.id })
      }
      onProgress?.(enviados, pendentes.length)
    }
    notifyPendingChanged()

    const merged = await sincronizarDeSupabase()
    const total = merged.length > 0 ? merged.length : locais.length

    if (enviados === 0 && pendentes.length > 0) {
      return {
        ok: false,
        total,
        enviados,
        erro: ultimoErro ?? 'Não foi possível enviar ao banco. Verifique a conexão e tente de novo.',
      }
    }

    return { ok: true, total, enviados }
  })().finally(() => {
    syncEmAndamento = null
  })

  return syncEmAndamento
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
