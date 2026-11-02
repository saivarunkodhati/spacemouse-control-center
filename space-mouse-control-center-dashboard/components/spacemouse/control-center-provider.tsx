'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { createHistory, historyReducer, type HistoryAction, type HistoryState } from '@/lib/config/history'
import {
  CONFIG_APP_ID,
  CONFIG_SCHEMA_VERSION,
  createDefaultConfig,
  parseBackups,
  parseCorrupt,
  validateConfig,
  type BackupEntry,
  type BackupReason,
  type ConfigFileV1,
  type CorruptRecord,
} from '@/lib/config/schema'
import { deleteKey, isStorageAvailable, readKey, writeKey } from '@/lib/config/storage'
import { DEFAULT_CALIBRATION, PROFILES } from '@/lib/spacemouse/constants'
import type { CalibrationData, DeviceSettings, Profile } from '@/lib/spacemouse/types'
import { useSerialDevice } from '@/lib/spacemouse/use-serial-device'
import { useTelemetry } from '@/lib/spacemouse/use-telemetry'

export interface Toast {
  id: number
  message: string
  tone: 'ok' | 'warn' | 'error'
}

export type PersistenceStatus = 'loading' | 'saving' | 'saved' | 'error' | 'unavailable'

export interface PersistenceState {
  status: PersistenceStatus
  savedAt: string | null
  error?: string
}

const MAX_BACKUPS = 25
const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const AUTOSAVE_DELAY_MS = 500

function sameSettings(a: DeviceSettings, b: DeviceSettings) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function contentKey(c: Pick<ConfigFileV1, 'activeProfileId' | 'workingSettings' | 'profiles' | 'calibration'>) {
  return JSON.stringify([c.activeProfileId, c.workingSettings, c.profiles, c.calibration])
}

type SettingsReducer = (state: HistoryState<DeviceSettings>, action: HistoryAction<DeviceSettings>) => HistoryState<DeviceSettings>

function useControlCenterState() {
  const [profiles, setProfiles] = useState<Profile[]>(PROFILES)
  const [activeProfileId, setActiveProfileId] = useState(PROFILES[0].id)
  const [history, dispatchHistory] = useReducer(
    historyReducer as SettingsReducer,
    PROFILES[0].settings,
    createHistory,
  )
  const settings = history.present
  const [calibration, setCalibration] = useState<CalibrationData>(DEFAULT_CALIBRATION)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const [hydrated, setHydrated] = useState(false)
  const [persistence, setPersistence] = useState<PersistenceState>({ status: 'loading', savedAt: null })
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [corrupt, setCorrupt] = useState<CorruptRecord | null>(null)
  const lastSavedKey = useRef<string | null>(null)

  const device = useSerialDevice()
  const telemetry = useTelemetry(settings, calibration, device)

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
  const isDirty = !sameSettings(settings, activeProfile.settings)

  const latest = useRef({ profiles, activeProfileId, settings, calibration, backups })
  latest.current = { profiles, activeProfileId, settings, calibration, backups }

  const notify = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, tone })
    toastTimer.current = window.setTimeout(() => setToast(null), 3600)
  }, [])

  const buildConfig = useCallback((): ConfigFileV1 => {
    const s = latest.current
    return {
      app: CONFIG_APP_ID,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      activeProfileId: s.activeProfileId,
      workingSettings: s.settings,
      profiles: s.profiles,
      calibration: s.calibration,
    }
  }, [])

  const applyConfig = useCallback((config: ConfigFileV1) => {
    setProfiles(config.profiles)
    setActiveProfileId(config.activeProfileId)
    dispatchHistory({ type: 'reset', value: config.workingSettings })
    setCalibration(config.calibration)
  }, [])

  // Load the stored configuration once on mount (IndexedDB is client-only and asynchronous).
  useEffect(() => {
    let cancelled = false
    if (!isStorageAvailable()) {
      setPersistence({ status: 'unavailable', savedAt: null, error: 'IndexedDB is not available in this browser' })
      setHydrated(true)
      return
    }
    ;(async () => {
      try {
        const [rawConfig, rawBackups, rawCorrupt] = await Promise.all([readKey('config'), readKey('backups'), readKey('corrupt')])
        if (cancelled) return
        let storedBackups = parseBackups(rawBackups)
        let corruptRecord = parseCorrupt(rawCorrupt)

        if (rawConfig !== undefined) {
          const result = validateConfig(rawConfig)
          if (result.ok) {
            applyConfig(result.value)
            lastSavedKey.current = contentKey(result.value)
            setPersistence({ status: 'saved', savedAt: result.value.savedAt })
            if (result.warnings.length > 0) notify(`Configuration loaded with ${result.warnings.length} correction(s)`, 'warn')

            const lastAuto = storedBackups.find((b) => b.reason === 'auto')
            if (!lastAuto || Date.now() - Date.parse(lastAuto.createdAt) > AUTO_BACKUP_INTERVAL_MS) {
              const entry: BackupEntry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), reason: 'auto', config: result.value }
              storedBackups = [entry, ...storedBackups].slice(0, MAX_BACKUPS)
              await writeKey('backups', storedBackups)
            }
          } else {
            corruptRecord = { detectedAt: new Date().toISOString(), errors: result.errors, raw: rawConfig }
            await writeKey('corrupt', corruptRecord)
            setPersistence({ status: 'saving', savedAt: null })
            notify('Stored configuration was invalid. Defaults loaded; the damaged copy is kept in Configuration Manager.', 'warn')
          }
        } else {
          setPersistence({ status: 'saving', savedAt: null })
        }
        if (cancelled) return
        setBackups(storedBackups)
        setCorrupt(corruptRecord)
      } catch (err) {
        if (cancelled) return
        setPersistence({ status: 'error', savedAt: null, error: err instanceof Error ? err.message : 'Unable to read configuration' })
      }
      if (!cancelled) setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [applyConfig, notify])

  // Debounced autosave of every configuration change.
  useEffect(() => {
    if (!hydrated || !isStorageAvailable()) return
    const key = contentKey({ activeProfileId, workingSettings: settings, profiles, calibration })
    if (key === lastSavedKey.current) return
    setPersistence((p) => (p.status === 'saving' ? p : { ...p, status: 'saving' }))
    const timer = window.setTimeout(async () => {
      const config = buildConfig()
      try {
        await writeKey('config', config)
        lastSavedKey.current = key
        setPersistence({ status: 'saved', savedAt: config.savedAt })
      } catch (err) {
        setPersistence((p) => ({ status: 'error', savedAt: p.savedAt, error: err instanceof Error ? err.message : 'Save failed' }))
      }
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [hydrated, activeProfileId, settings, profiles, calibration, buildConfig])

  const setSettings = useCallback((next: DeviceSettings) => dispatchHistory({ type: 'set', value: next, at: Date.now() }), [])
  const undo = useCallback(() => dispatchHistory({ type: 'undo' }), [])
  const redo = useCallback(() => dispatchHistory({ type: 'redo' }), [])

  const activateProfile = useCallback(
    (id: string) => {
      const profile = latest.current.profiles.find((p) => p.id === id)
      if (!profile) return
      setActiveProfileId(id)
      dispatchHistory({ type: 'reset', value: profile.settings })
      notify(`Profile "${profile.name}" activated`)
    },
    [notify],
  )

  const saveSettingsToProfile = useCallback(() => {
    setProfiles((prev) => prev.map((p) => (p.id === activeProfileId ? { ...p, settings } : p)))
    notify(`Saved to "${activeProfile.name}"`)
  }, [activeProfileId, activeProfile.name, settings, notify])

  const revertSettings = useCallback(() => setSettings(activeProfile.settings), [activeProfile.settings, setSettings])

  const createProfile = useCallback(
    (input: { name: string; description: string; settings?: DeviceSettings }) => {
      const profile: Profile = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description,
        builtIn: false,
        settings: input.settings ?? latest.current.settings,
      }
      setProfiles((prev) => [...prev, profile])
      setActiveProfileId(profile.id)
      dispatchHistory({ type: 'reset', value: profile.settings })
      notify(`Profile "${profile.name}" created`)
      return profile
    },
    [notify],
  )

  const updateProfileMeta = useCallback(
    (id: string, meta: { name: string; description: string }) => {
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...meta } : p)))
      notify('Profile updated')
    },
    [notify],
  )

  const duplicateProfile = useCallback(
    (id: string) => {
      const source = latest.current.profiles.find((p) => p.id === id)
      if (!source) return
      const copy: Profile = { ...source, id: crypto.randomUUID(), name: `${source.name} Copy`.slice(0, 48), builtIn: false }
      setProfiles((prev) => [...prev, copy])
      notify(`Duplicated "${source.name}"`)
    },
    [notify],
  )

  const deleteProfile = useCallback(
    (id: string) => {
      const target = latest.current.profiles.find((p) => p.id === id)
      if (!target || target.builtIn) return
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      if (id === latest.current.activeProfileId) {
        setActiveProfileId(PROFILES[0].id)
        dispatchHistory({ type: 'reset', value: latest.current.profiles.find((p) => p.id === PROFILES[0].id)?.settings ?? PROFILES[0].settings })
      }
      notify(`Deleted "${target.name}"`, 'warn')
    },
    [notify],
  )

  const importProfiles = useCallback(
    (incoming: Profile[]) => {
      const imported = incoming.map((p) => ({ ...p, id: crypto.randomUUID(), builtIn: false }))
      setProfiles((prev) => [...prev, ...imported])
      notify(`Imported ${imported.length} profile${imported.length === 1 ? '' : 's'}`)
    },
    [notify],
  )

  const persistBackups = useCallback(async (next: BackupEntry[]) => {
    setBackups(next)
    if (isStorageAvailable()) await writeKey('backups', next)
  }, [])

  const createBackup = useCallback(
    async (reason: BackupReason = 'manual') => {
      const entry: BackupEntry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), reason, config: buildConfig() }
      try {
        await persistBackups([entry, ...latest.current.backups].slice(0, MAX_BACKUPS))
        if (reason === 'manual') notify('Backup created')
        return true
      } catch (err) {
        notify(err instanceof Error ? `Backup failed: ${err.message}` : 'Backup failed', 'error')
        return false
      }
    },
    [buildConfig, persistBackups, notify],
  )

  const deleteBackup = useCallback(
    async (id: string) => {
      await persistBackups(latest.current.backups.filter((b) => b.id !== id))
      notify('Backup deleted', 'warn')
    },
    [persistBackups, notify],
  )

  const restoreBackup = useCallback(
    async (id: string) => {
      const entry = latest.current.backups.find((b) => b.id === id)
      if (!entry) return
      if (!(await createBackup('before-restore'))) return
      applyConfig(entry.config)
      notify(`Restored backup from ${new Date(entry.createdAt).toLocaleString()}`)
    },
    [applyConfig, createBackup, notify],
  )

  const importConfig = useCallback(
    async (config: ConfigFileV1) => {
      if (!(await createBackup('before-import'))) return
      applyConfig(config)
      notify('Configuration imported')
    },
    [applyConfig, createBackup, notify],
  )

  const resetAll = useCallback(async () => {
    if (!(await createBackup('before-reset'))) return
    applyConfig(createDefaultConfig())
    notify('All configuration reset to defaults', 'warn')
  }, [applyConfig, createBackup, notify])

  const discardCorrupt = useCallback(async () => {
    setCorrupt(null)
    if (isStorageAvailable()) await deleteKey('corrupt')
    notify('Damaged configuration copy discarded', 'warn')
  }, [notify])

  return {
    profiles,
    activeProfile,
    activateProfile,
    createProfile,
    updateProfileMeta,
    duplicateProfile,
    deleteProfile,
    importProfiles,
    settings,
    setSettings,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    isDirty,
    saveSettingsToProfile,
    revertSettings,
    calibration,
    setCalibration,
    device,
    telemetry,
    toast,
    notify,
    hydrated,
    persistence,
    backups,
    corrupt,
    buildConfig,
    createBackup,
    deleteBackup,
    restoreBackup,
    importConfig,
    resetAll,
    discardCorrupt,
  }
}

export type ControlCenter = ReturnType<typeof useControlCenterState>

const ControlCenterContext = createContext<ControlCenter | null>(null)

export function ControlCenterProvider({ children }: { children: ReactNode }) {
  const value = useControlCenterState()
  return <ControlCenterContext.Provider value={value}>{children}</ControlCenterContext.Provider>
}

export function useControlCenter() {
  const ctx = useContext(ControlCenterContext)
  if (!ctx) throw new Error('useControlCenter must be used within ControlCenterProvider')
  return ctx
}

export function useIsCalibrated() {
  const { calibration } = useControlCenter()
  return useMemo(() => calibration.calibratedAt !== null, [calibration.calibratedAt])
}
