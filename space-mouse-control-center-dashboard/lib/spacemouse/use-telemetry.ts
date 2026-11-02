'use client'

import { useEffect, useRef, useState } from 'react'
import { ZERO_FRAME } from './constants'
import { processFrame, simulatedRaw } from './processing'
import type { CalibrationData, DeviceSettings, TelemetryFrame, TelemetrySnapshot } from './types'
import type { SerialDevice } from './use-serial-device'

export const TICK_MS = 50
export const HISTORY_LENGTH = 240

export interface TelemetryHistory {
  raw: TelemetryFrame[]
  frame: TelemetryFrame[]
  intervals: number[]
}

/**
 * Unified telemetry pipeline. Reads raw samples from the connected serial
 * device, or from the built-in simulator when no device is connected, then
 * applies calibration and the active device settings.
 */
export function useTelemetry(settings: DeviceSettings, calibration: CalibrationData, device: SerialDevice) {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>({
    source: 'simulated',
    frame: ZERO_FRAME,
    raw: ZERO_FRAME,
    rate: 0,
  })
  const frameRef = useRef<TelemetryFrame>(ZERO_FRAME)
  const historyRef = useRef<TelemetryHistory>({ raw: [], frame: [], intervals: [] })
  /** Simulator emulates a puck at rest while true (used by calibration). */
  const simStillRef = useRef(false)

  const settingsRef = useRef(settings)
  const calibrationRef = useRef(calibration)
  const connectedRef = useRef(false)
  const { rawRef, statsRef } = device

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    calibrationRef.current = calibration
  }, [calibration])
  useEffect(() => {
    connectedRef.current = device.connection.status === 'connected'
  }, [device.connection.status])

  useEffect(() => {
    const start = performance.now()
    let lastTick = start
    let rateWindowStart = start
    let packetsAtWindow = statsRef.current.packets
    let rate = 1000 / TICK_MS

    const id = window.setInterval(() => {
      const now = performance.now()
      const connected = connectedRef.current
      const raw = connected ? rawRef.current : simulatedRaw((now - start) / 1000, simStillRef.current)
      const next = processFrame(raw, frameRef.current, calibrationRef.current, settingsRef.current)

      if (now - rateWindowStart >= 1000) {
        const packets = statsRef.current.packets
        rate = connected ? ((packets - packetsAtWindow) * 1000) / (now - rateWindowStart) : 1000 / TICK_MS
        packetsAtWindow = packets
        rateWindowStart = now
      }

      const h = historyRef.current
      h.raw.push(raw)
      h.frame.push(next)
      h.intervals.push(now - lastTick)
      if (h.raw.length > HISTORY_LENGTH) {
        h.raw.shift()
        h.frame.shift()
        h.intervals.shift()
      }
      lastTick = now

      frameRef.current = next
      setSnapshot({ source: connected ? 'device' : 'simulated', frame: next, raw, rate })
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [rawRef, statsRef])

  return { snapshot, frameRef, historyRef, simStillRef }
}
