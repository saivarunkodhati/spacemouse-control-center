import type {
  AxisCalibration,
  AxisDefinition,
  AxisId,
  AxisSettings,
  CalibrationData,
  ConnectionState,
  ConnectionStatus,
  DeviceSettings,
  Profile,
  ResponseCurve,
  TelemetryFrame,
} from './types'

export const AXES: AxisDefinition[] = [
  { id: 'x', label: 'X', description: 'Translation X', kind: 'translation', range: 1, unit: 'norm', decimals: 3 },
  { id: 'y', label: 'Y', description: 'Translation Y', kind: 'translation', range: 1, unit: 'norm', decimals: 3 },
  { id: 'z', label: 'Z', description: 'Translation Z', kind: 'translation', range: 1, unit: 'norm', decimals: 3 },
  { id: 'rx', label: 'Rx', description: 'Rotation X', kind: 'rotation', range: 30, unit: 'deg', decimals: 1 },
  { id: 'ry', label: 'Ry', description: 'Rotation Y', kind: 'rotation', range: 30, unit: 'deg', decimals: 1 },
  { id: 'rz', label: 'Rz', description: 'Rotation Z', kind: 'rotation', range: 30, unit: 'deg', decimals: 1 },
]

export const AXIS_IDS: AxisId[] = AXES.map((a) => a.id)

/** Distinct trace colours for multi-axis plots, ordered as AXES. */
export const AXIS_COLORS: Record<AxisId, string> = {
  x: '#ff6a24',
  y: '#ffb16d',
  z: '#f0f0eb',
  rx: '#74d5a0',
  ry: '#6fb8e8',
  rz: '#c49bf0',
}

export const ZERO_FRAME: TelemetryFrame = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }

function mapAxes<T>(fn: (id: AxisId) => T): Record<AxisId, T> {
  return Object.fromEntries(AXIS_IDS.map((id) => [id, fn(id)])) as Record<AxisId, T>
}

export const DEFAULT_AXIS_SETTINGS: AxisSettings = { enabled: true, inverted: false, scale: 100 }

export const DEFAULT_SETTINGS: DeviceSettings = {
  sensitivity: 50,
  deadZone: 3,
  smoothing: 35,
  curve: 'linear',
  dominantAxis: false,
  pollingRate: 100,
  axes: mapAxes(() => ({ ...DEFAULT_AXIS_SETTINGS })),
}

export const DEFAULT_AXIS_CALIBRATION: AxisCalibration = { offset: 0, min: -1, max: 1, noise: 0 }

export const DEFAULT_CALIBRATION: CalibrationData = {
  axes: mapAxes(() => ({ ...DEFAULT_AXIS_CALIBRATION })),
  calibratedAt: null,
  source: null,
}

export const CURVE_OPTIONS: { id: ResponseCurve; label: string; hint: string }[] = [
  { id: 'linear', label: 'Linear', hint: '1:1 response' },
  { id: 'progressive', label: 'Progressive', hint: 'Fine control near center' },
  { id: 'aggressive', label: 'Aggressive', hint: 'Fast initial response' },
]

export const POLLING_RATES = [50, 100, 125, 250] as const
export const BAUD_RATES = [9600, 38400, 57600, 115200, 230400] as const
export const DEFAULT_BAUD_RATE = 115200

export const PROFILES: Profile[] = [
  {
    id: 'default',
    name: 'Default Profile',
    description: 'Balanced response',
    builtIn: true,
    settings: DEFAULT_SETTINGS,
  },
  {
    id: 'precision',
    name: 'Precision',
    description: 'Fine detail work',
    builtIn: true,
    settings: { ...DEFAULT_SETTINGS, sensitivity: 30, deadZone: 5, smoothing: 60, curve: 'progressive' },
  },
  {
    id: 'fast',
    name: 'Fast Navigation',
    description: 'Large scene travel',
    builtIn: true,
    settings: { ...DEFAULT_SETTINGS, sensitivity: 80, deadZone: 2, smoothing: 15, curve: 'aggressive', pollingRate: 250 },
  },
]

export const INITIAL_CONNECTION: ConnectionState = { status: 'disconnected' }

export const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  connected: 'Connected',
  error: 'Error',
}

export const DATA_STREAM_LABELS: Record<ConnectionStatus, string> = {
  disconnected: 'Simulated',
  connecting: 'Negotiating',
  connected: 'Streaming',
  error: 'Interrupted',
}

export const HARDWARE = {
  controller: 'Arduino Pro Micro',
  sensor: 'MPU6050',
} as const
