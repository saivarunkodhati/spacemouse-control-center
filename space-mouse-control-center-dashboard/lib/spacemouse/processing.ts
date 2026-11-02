import { AXES, AXIS_IDS } from './constants'
import type {
  AxisId,
  CalibrationData,
  DeviceSettings,
  ResponseCurve,
  TelemetryFrame,
} from './types'

const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v))

export function applyCurve(v: number, curve: ResponseCurve): number {
  const mag = Math.abs(v)
  const sign = Math.sign(v)
  if (curve === 'progressive') return sign * mag ** 1.8
  if (curve === 'aggressive') return sign * mag ** 0.6
  return v
}

export function sensitivityGain(sensitivity: number) {
  return 0.4 + (sensitivity / 100) * 1.2
}

/** Normalised output [-1, 1] for one axis, before smoothing. */
export function processAxis(
  raw: number,
  axis: AxisId,
  calibration: CalibrationData,
  settings: DeviceSettings,
): number {
  const cal = calibration.axes[axis]
  const axisSettings = settings.axes[axis]
  if (!axisSettings.enabled) return 0

  let v = raw - cal.offset
  const span = v >= 0 ? cal.max - cal.offset : cal.offset - cal.min
  if (span > 0.05) v /= span
  v = clamp(v)
  if (axisSettings.inverted) v = -v

  const dz = settings.deadZone / 100
  const mag = Math.abs(v)
  v = mag < dz ? 0 : (Math.sign(v) * (mag - dz)) / (1 - dz)

  v = applyCurve(v, settings.curve)
  v *= sensitivityGain(settings.sensitivity) * (axisSettings.scale / 100)
  return clamp(v)
}

export function processFrame(
  raw: TelemetryFrame,
  prev: TelemetryFrame,
  calibration: CalibrationData,
  settings: DeviceSettings,
): TelemetryFrame {
  const normalised = {} as TelemetryFrame
  for (const id of AXIS_IDS) normalised[id] = processAxis(raw[id], id, calibration, settings)

  if (settings.dominantAxis) {
    let strongest: AxisId = 'x'
    for (const id of AXIS_IDS) {
      if (Math.abs(normalised[id]) > Math.abs(normalised[strongest])) strongest = id
    }
    for (const id of AXIS_IDS) if (id !== strongest) normalised[id] = 0
  }

  const alpha = 1 - (settings.smoothing / 100) * 0.9
  const next = {} as TelemetryFrame
  for (const axis of AXES) {
    const target = normalised[axis.id] * axis.range
    next[axis.id] = prev[axis.id] + (target - prev[axis.id]) * alpha
  }
  return next
}

/** Per-axis wave parameters for a gentle, non-repeating-looking demo signal. */
const WAVES: Record<AxisId, [number, number, number, number]> = {
  x: [0.21, 0.53, 0.0, 1.7],
  y: [0.17, 0.41, 1.2, 0.6],
  z: [0.13, 0.37, 2.4, 3.1],
  rx: [0.19, 0.47, 0.8, 2.2],
  ry: [0.15, 0.33, 3.0, 0.4],
  rz: [0.11, 0.29, 1.9, 2.7],
}

/** Small constant sensor bias so calibration has something real to correct. */
const SIM_BIAS: Record<AxisId, number> = { x: 0.035, y: -0.022, z: 0.041, rx: -0.03, ry: 0.018, rz: -0.012 }
const SIM_NOISE = 0.008

/**
 * Simulated raw sensor sample. `still` emulates the puck being held at rest
 * (used during the zero-offset step of calibration).
 */
export function simulatedRaw(t: number, still = false): TelemetryFrame {
  const frame = {} as TelemetryFrame
  for (const id of AXIS_IDS) {
    const [f1, f2, p1, p2] = WAVES[id]
    const motion = still
      ? 0
      : 0.78 * Math.sin(t * f1 * Math.PI * 2 + p1) + 0.32 * Math.sin(t * f2 * Math.PI * 2 + p2)
    const noise = (Math.random() + Math.random() + Math.random() - 1.5) * SIM_NOISE
    frame[id] = clamp(motion + SIM_BIAS[id] + noise, -1.05, 1.05)
  }
  return frame
}

export function mean(values: number[]) {
  if (values.length === 0) return 0
  let s = 0
  for (const v of values) s += v
  return s / values.length
}

export function stdDev(values: number[]) {
  if (values.length < 2) return 0
  const m = mean(values)
  let s = 0
  for (const v of values) s += (v - m) ** 2
  return Math.sqrt(s / (values.length - 1))
}
