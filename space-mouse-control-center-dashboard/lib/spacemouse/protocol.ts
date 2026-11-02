import { AXIS_IDS } from './constants'
import type { CalibrationData, DeviceSettings, TelemetryFrame } from './types'

export type ParsedLine =
  | { kind: 'frame'; frame: TelemetryFrame }
  | { kind: 'message'; text: string }
  | { kind: 'invalid'; text: string }

const RAW_INT16_SCALE = 32768

/**
 * Accepts either a JSON object `{"x":..,"y":..,"z":..,"rx":..,"ry":..,"rz":..}`
 * or six numbers separated by commas, spaces, tabs or semicolons, in the order
 * X Y Z Rx Ry Rz. Values beyond ±1.5 are treated as raw int16 MPU6050 readings.
 */
export function parseLine(line: string): ParsedLine {
  const text = line.trim()
  if (!text) return { kind: 'invalid', text }

  let values: number[] | null = null

  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>
      const arr = AXIS_IDS.map((id) => Number(obj[id]))
      if (arr.every(Number.isFinite)) values = arr
    } catch {
      return { kind: 'invalid', text }
    }
  } else {
    const parts = text.split(/[,\s;]+/).filter(Boolean)
    if (parts.length >= 6) {
      const arr = parts.slice(0, 6).map(Number)
      if (arr.every(Number.isFinite)) values = arr
      else if (/^[a-z]/i.test(text)) return { kind: 'message', text }
    } else if (/^[a-z#>]/i.test(text)) {
      return { kind: 'message', text }
    }
  }

  if (!values) return { kind: 'invalid', text }

  const isRaw = values.some((v) => Math.abs(v) > 1.5)
  const frame = {} as TelemetryFrame
  AXIS_IDS.forEach((id, i) => {
    frame[id] = isRaw ? values![i] / RAW_INT16_SCALE : values![i]
  })
  return { kind: 'frame', frame }
}

const fmt = (n: number) => n.toFixed(4)

export function buildSettingsCommands(settings: DeviceSettings): string[] {
  const lines = [
    `CFG sens=${settings.sensitivity} dz=${settings.deadZone} smooth=${settings.smoothing} curve=${settings.curve} dominant=${settings.dominantAxis ? 1 : 0} rate=${settings.pollingRate}`,
  ]
  for (const id of AXIS_IDS) {
    const a = settings.axes[id]
    lines.push(`AXIS ${id} en=${a.enabled ? 1 : 0} inv=${a.inverted ? 1 : 0} scale=${a.scale}`)
  }
  lines.push('SAVE')
  return lines
}

export function buildCalibrationCommands(calibration: CalibrationData): string[] {
  const lines = AXIS_IDS.map((id) => {
    const c = calibration.axes[id]
    return `CAL ${id} off=${fmt(c.offset)} min=${fmt(c.min)} max=${fmt(c.max)}`
  })
  lines.push('SAVE')
  return lines
}

export const PROTOCOL_EXAMPLES = {
  inbound: ['0.012,-0.104,0.000,1.250,-0.500,0.020', '{"x":0.01,"y":-0.1,"z":0,"rx":0.04,"ry":-0.02,"rz":0}', '-412 1833 96 -220 41 7'],
  outbound: ['CFG sens=50 dz=3 smooth=35 curve=linear dominant=0 rate=100', 'AXIS rx en=1 inv=0 scale=100', 'CAL x off=0.0350 min=-0.9650 max=1.0350', 'SAVE', 'PING'],
}
