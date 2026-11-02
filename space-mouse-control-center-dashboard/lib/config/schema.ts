import { AXIS_IDS, CURVE_OPTIONS, DEFAULT_AXIS_CALIBRATION, DEFAULT_CALIBRATION, DEFAULT_SETTINGS, POLLING_RATES, PROFILES } from '@/lib/spacemouse/constants'
import type { AxisCalibration, AxisId, AxisSettings, CalibrationData, DeviceSettings, Profile, ResponseCurve } from '@/lib/spacemouse/types'

export const CONFIG_APP_ID = 'spacemouse-control-center' as const
export const CONFIG_SCHEMA_VERSION = 1 as const

export interface ConfigFileV1 {
  app: typeof CONFIG_APP_ID
  schemaVersion: 1
  savedAt: string
  activeProfileId: string
  /** Working copy being edited; may differ from the active profile (unsaved changes). */
  workingSettings: DeviceSettings
  profiles: Profile[]
  calibration: CalibrationData
}

export type ConfigFile = ConfigFileV1

export type ParseResult<T> = { ok: true; value: T; warnings: string[] } | { ok: false; errors: string[] }

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

const BUILT_IN_IDS = new Set(PROFILES.map((p) => p.id))
const CURVES = new Set<ResponseCurve>(CURVE_OPTIONS.map((c) => c.id))

function readNumber(src: Obj, key: string, path: string, min: number, max: number, fallback: number, warnings: string[]) {
  const v = src[key]
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    warnings.push(`${path}.${key} is missing or not a number; using ${fallback}`)
    return fallback
  }
  if (v < min || v > max) {
    warnings.push(`${path}.${key} = ${v} is outside ${min}–${max}; clamped`)
    return Math.min(max, Math.max(min, v))
  }
  return v
}

function readBool(src: Obj, key: string, path: string, fallback: boolean, warnings: string[]) {
  const v = src[key]
  if (typeof v === 'boolean') return v
  if (v !== undefined) warnings.push(`${path}.${key} is not a boolean; using ${fallback}`)
  return fallback
}

function readString(src: Obj, key: string, maxLength: number) {
  const v = src[key]
  return typeof v === 'string' ? v.slice(0, maxLength) : ''
}

export function parseSettings(raw: unknown, path: string, warnings: string[]): DeviceSettings | null {
  if (!isObj(raw)) {
    warnings.push(`${path} is not an object`)
    return null
  }
  const d = DEFAULT_SETTINGS
  const curve = CURVES.has(raw.curve as ResponseCurve) ? (raw.curve as ResponseCurve) : d.curve
  if (raw.curve !== undefined && curve !== raw.curve) warnings.push(`${path}.curve "${String(raw.curve)}" is unknown; using ${d.curve}`)

  const polling = POLLING_RATES.includes(raw.pollingRate as (typeof POLLING_RATES)[number])
    ? (raw.pollingRate as number)
    : d.pollingRate
  if (raw.pollingRate !== undefined && polling !== raw.pollingRate) warnings.push(`${path}.pollingRate is unsupported; using ${d.pollingRate} Hz`)

  const rawAxes = isObj(raw.axes) ? raw.axes : {}
  const axes = {} as Record<AxisId, AxisSettings>
  for (const id of AXIS_IDS) {
    const a = rawAxes[id]
    const ap = `${path}.axes.${id}`
    if (!isObj(a)) {
      axes[id] = { ...d.axes[id] }
      continue
    }
    axes[id] = {
      enabled: readBool(a, 'enabled', ap, true, warnings),
      inverted: readBool(a, 'inverted', ap, false, warnings),
      scale: Math.round(readNumber(a, 'scale', ap, 0, 200, 100, warnings)),
    }
  }

  return {
    sensitivity: Math.round(readNumber(raw, 'sensitivity', path, 1, 100, d.sensitivity, warnings)),
    deadZone: Math.round(readNumber(raw, 'deadZone', path, 0, 20, d.deadZone, warnings)),
    smoothing: Math.round(readNumber(raw, 'smoothing', path, 0, 100, d.smoothing, warnings)),
    curve,
    dominantAxis: readBool(raw, 'dominantAxis', path, d.dominantAxis, warnings),
    pollingRate: polling,
    axes,
  }
}

export function parseCalibration(raw: unknown, path: string, warnings: string[]): CalibrationData {
  if (!isObj(raw)) {
    if (raw !== undefined) warnings.push(`${path} is not an object; using factory calibration`)
    return structuredClone(DEFAULT_CALIBRATION)
  }
  const rawAxes = isObj(raw.axes) ? raw.axes : {}
  const axes = {} as Record<AxisId, AxisCalibration>
  for (const id of AXIS_IDS) {
    const a = rawAxes[id]
    const ap = `${path}.axes.${id}`
    if (!isObj(a)) {
      axes[id] = { ...DEFAULT_AXIS_CALIBRATION }
      continue
    }
    const entry: AxisCalibration = {
      offset: readNumber(a, 'offset', ap, -10, 10, 0, warnings),
      min: readNumber(a, 'min', ap, -10, 10, -1, warnings),
      max: readNumber(a, 'max', ap, -10, 10, 1, warnings),
      noise: readNumber(a, 'noise', ap, 0, 10, 0, warnings),
    }
    if (entry.min >= entry.max) {
      warnings.push(`${ap} has min ≥ max; axis reset to factory calibration`)
      axes[id] = { ...DEFAULT_AXIS_CALIBRATION }
    } else {
      axes[id] = entry
    }
  }
  const calibratedAt = typeof raw.calibratedAt === 'string' && !Number.isNaN(Date.parse(raw.calibratedAt)) ? raw.calibratedAt : null
  const source = raw.source === 'device' || raw.source === 'simulated' ? raw.source : null
  return { axes, calibratedAt, source }
}

function parseProfile(raw: unknown, path: string, warnings: string[]): Profile | null {
  if (!isObj(raw)) {
    warnings.push(`${path} skipped: not an object`)
    return null
  }
  const name = readString(raw, 'name', 48).trim()
  if (!name) {
    warnings.push(`${path} skipped: missing name`)
    return null
  }
  const settings = parseSettings(raw.settings, `${path}.settings`, warnings)
  if (!settings) {
    warnings.push(`${path} ("${name}") skipped: invalid settings`)
    return null
  }
  const id = typeof raw.id === 'string' && raw.id.length > 0 && raw.id.length <= 64 ? raw.id : crypto.randomUUID()
  return {
    id,
    name,
    description: readString(raw, 'description', 120),
    builtIn: BUILT_IN_IDS.has(id) && raw.builtIn === true,
    settings,
  }
}

/** Accepts legacy profile exports: a single `{ name, description, settings }` or an array of them. */
export function parseProfileList(raw: unknown): ParseResult<Profile[]> {
  const list = Array.isArray(raw) ? raw : [raw]
  const warnings: string[] = []
  const profiles = list
    .map((p, i) => parseProfile(isObj(p) ? { ...p, id: undefined, builtIn: false } : p, `profiles[${i}]`, warnings))
    .filter((p): p is Profile => p !== null)
  if (profiles.length === 0) return { ok: false, errors: ['No valid profiles in file', ...warnings.slice(0, 3)] }
  return { ok: true, value: profiles, warnings }
}

/** Upgrades older schema versions in place. Add an entry per version bump: MIGRATIONS[n] converts n → n+1. */
const MIGRATIONS: Record<number, (raw: Obj) => Obj> = {}

export function validateConfig(raw: unknown): ParseResult<ConfigFileV1> {
  if (!isObj(raw)) return { ok: false, errors: ['File is not a JSON object'] }
  if (raw.app !== CONFIG_APP_ID) return { ok: false, errors: ['Not a SpaceMouse Control Center configuration file'] }

  let version = raw.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, errors: ['Missing or invalid schemaVersion'] }
  }
  if (version > CONFIG_SCHEMA_VERSION) {
    return { ok: false, errors: [`Schema version ${version} was created by a newer release (this release reads ≤ ${CONFIG_SCHEMA_VERSION})`] }
  }
  let data: Obj = raw
  while (version < CONFIG_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version]
    if (!migrate) return { ok: false, errors: [`No migration available from schema version ${version}`] }
    data = migrate(data)
    version += 1
  }

  if (!Array.isArray(data.profiles)) return { ok: false, errors: ['profiles must be an array'] }

  const warnings: string[] = []
  const seen = new Set<string>()
  const profiles: Profile[] = []
  data.profiles.forEach((p, i) => {
    const parsed = parseProfile(p, `profiles[${i}]`, warnings)
    if (!parsed) return
    if (seen.has(parsed.id)) {
      warnings.push(`profiles[${i}] duplicate id "${parsed.id}"; assigned a new id`)
      parsed.id = crypto.randomUUID()
      parsed.builtIn = false
    }
    seen.add(parsed.id)
    profiles.push(parsed)
  })
  for (const builtIn of PROFILES) {
    if (!seen.has(builtIn.id)) profiles.unshift(structuredClone(builtIn))
  }

  let activeProfileId = typeof data.activeProfileId === 'string' ? data.activeProfileId : ''
  if (!profiles.some((p) => p.id === activeProfileId)) {
    if (activeProfileId) warnings.push(`activeProfileId "${activeProfileId}" not found; using "${profiles[0].name}"`)
    activeProfileId = profiles[0].id
  }
  const activeSettings = profiles.find((p) => p.id === activeProfileId)!.settings

  const workingSettings =
    data.workingSettings === undefined ? activeSettings : (parseSettings(data.workingSettings, 'workingSettings', warnings) ?? activeSettings)

  return {
    ok: true,
    warnings,
    value: {
      app: CONFIG_APP_ID,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
      activeProfileId,
      workingSettings,
      profiles,
      calibration: parseCalibration(data.calibration, 'calibration', warnings),
    },
  }
}

export function createDefaultConfig(): ConfigFileV1 {
  return {
    app: CONFIG_APP_ID,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    activeProfileId: PROFILES[0].id,
    workingSettings: structuredClone(PROFILES[0].settings),
    profiles: structuredClone(PROFILES),
    calibration: structuredClone(DEFAULT_CALIBRATION),
  }
}

export type BackupReason = 'manual' | 'auto' | 'before-restore' | 'before-import' | 'before-reset'

export interface BackupEntry {
  id: string
  createdAt: string
  reason: BackupReason
  config: ConfigFileV1
}

const BACKUP_REASONS = new Set<BackupReason>(['manual', 'auto', 'before-restore', 'before-import', 'before-reset'])

export function parseBackups(raw: unknown): BackupEntry[] {
  if (!Array.isArray(raw)) return []
  const out: BackupEntry[] = []
  for (const entry of raw) {
    if (!isObj(entry) || typeof entry.id !== 'string' || typeof entry.createdAt !== 'string') continue
    if (!BACKUP_REASONS.has(entry.reason as BackupReason)) continue
    const result = validateConfig(entry.config)
    if (!result.ok) continue
    out.push({ id: entry.id, createdAt: entry.createdAt, reason: entry.reason as BackupReason, config: result.value })
  }
  return out
}

export interface CorruptRecord {
  detectedAt: string
  errors: string[]
  raw: unknown
}

export function parseCorrupt(raw: unknown): CorruptRecord | null {
  if (!isObj(raw) || typeof raw.detectedAt !== 'string' || !Array.isArray(raw.errors)) return null
  return { detectedAt: raw.detectedAt, errors: raw.errors.map(String), raw: raw.raw }
}
