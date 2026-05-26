import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FormularioEME } from '../types/eme'
import type { AcionamentoData } from '../types/acionamento'

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

export async function salvarFormulario(form: FormularioEME): Promise<void> {
  const db = await getDB()
  const atualizado = { ...form, atualizadoEm: new Date().toISOString() }
  await db.put('formularios', atualizado)
}

export async function buscarFormulario(id: string): Promise<FormularioEME | undefined> {
  const db = await getDB()
  return db.get('formularios', id)
}

export async function listarFormularios(): Promise<FormularioEME[]> {
  const db = await getDB()
  const todos = await db.getAll('formularios')
  return todos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
}

export async function excluirFormulario(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('formularios', id)
}

// ── Acionamentos ─────────────────────────────────────────────

export async function salvarAcionamento(record: AcionamentoRecord): Promise<void> {
  const db = await getDB()
  await db.put('acionamentos', record)
}

export async function buscarAcionamento(name: string): Promise<AcionamentoRecord | undefined> {
  const db = await getDB()
  return db.get('acionamentos', name)
}

export async function listarAcionamentos(): Promise<AcionamentoRecord[]> {
  const db = await getDB()
  const todos = await db.getAll('acionamentos')
  return todos.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function excluirAcionamento(name: string): Promise<void> {
  const db = await getDB()
  await db.delete('acionamentos', name)
}
