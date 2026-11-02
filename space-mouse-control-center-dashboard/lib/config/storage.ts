const DB_NAME = 'spacemouse-control-center'
const DB_VERSION = 1
const STORE = 'kv'

export type StorageKey = 'config' | 'backups' | 'corrupt'

let dbPromise: Promise<IDBDatabase> | null = null

export function isStorageAvailable() {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error ?? new Error('Unable to open configuration database'))
    }
    request.onblocked = () => reject(new Error('Configuration database is blocked by another tab'))
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(request.result)
        tx.onerror = () => reject(tx.error ?? request.error ?? new Error('Storage transaction failed'))
        tx.onabort = () => reject(tx.error ?? new Error('Storage transaction aborted'))
      }),
  )
}

export function readKey(key: StorageKey): Promise<unknown> {
  return run('readonly', (s) => s.get(key))
}

export function writeKey(key: StorageKey, value: unknown): Promise<void> {
  return run('readwrite', (s) => s.put(value, key)).then(() => undefined)
}

export function deleteKey(key: StorageKey): Promise<void> {
  return run('readwrite', (s) => s.delete(key)).then(() => undefined)
}
