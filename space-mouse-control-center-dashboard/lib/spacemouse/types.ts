export type AxisId = 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz'

export type AxisKind = 'translation' | 'rotation'

export interface AxisDefinition {
  id: AxisId
  label: string
  description: string
  kind: AxisKind
  /** Symmetric display range: values are expected within [-range, range]. */
  range: number
  unit: string
  decimals: number
}

export type TelemetryFrame = Record<AxisId, number>

export type TelemetrySource = 'simulated' | 'device'

export interface TelemetrySnapshot {
  source: TelemetrySource
  /** Processed output in display units (normalised translation, degrees rotation). */
  frame: TelemetryFrame
  /** Unprocessed input, normalised to roughly [-1, 1]. */
  raw: TelemetryFrame
  /** Measured update rate of the active source, in Hz. */
  rate: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionState {
  status: ConnectionStatus
  message?: string
}

export type ResponseCurve = 'linear' | 'progressive' | 'aggressive'

export interface AxisSettings {
  enabled: boolean
  inverted: boolean
  /** 0–200 % per-axis multiplier */
  scale: number
}

export interface DeviceSettings {
  /** 1–100 % */
  sensitivity: number
  /** 0–20 % */
  deadZone: number
  /** 0–100 % */
  smoothing: number
  curve: ResponseCurve
  /** Only the strongest axis is passed through when enabled. */
  dominantAxis: boolean
  /** Device report rate in Hz. */
  pollingRate: number
  axes: Record<AxisId, AxisSettings>
}

export interface AxisCalibration {
  offset: number
  min: number
  max: number
  noise: number
}

export interface CalibrationData {
  axes: Record<AxisId, AxisCalibration>
  /** ISO timestamp, null when using factory defaults. */
  calibratedAt: string | null
  source: TelemetrySource | null
}

export interface Profile {
  id: string
  name: string
  description: string
  builtIn: boolean
  settings: DeviceSettings
}


export type LogLevel = 'info' | 'tx' | 'rx' | 'warn' | 'error'

export interface LogEntry {
  id: number
  time: number
  level: LogLevel
  message: string
}

export interface LinkStats {
  packets: number
  parseErrors: number
  bytes: number
  connectedAt: number | null
}
