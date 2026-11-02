'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { DEFAULT_BAUD_RATE, INITIAL_CONNECTION, ZERO_FRAME } from './constants'
import { parseLine } from './protocol'
import type { ConnectionState, LinkStats, LogEntry, LogLevel, TelemetryFrame } from './types'

const MAX_LOG = 250
const EMPTY_STATS: LinkStats = { packets: 0, parseErrors: 0, bytes: 0, connectedAt: null }

const noopSubscribe = () => () => {}
const getSupported = () => typeof navigator !== 'undefined' && 'serial' in navigator
const getServerSupported = () => false

function describePort(port: SerialPort) {
  const info = port.getInfo()
  if (info.usbVendorId === undefined) return 'Serial port'
  const hex = (n?: number) => (n ?? 0).toString(16).padStart(4, '0').toUpperCase()
  return `USB ${hex(info.usbVendorId)}:${hex(info.usbProductId)}`
}

export function useSerialDevice() {
  const supported = useSyncExternalStore(noopSubscribe, getSupported, getServerSupported)
  const [connection, setConnection] = useState<ConnectionState>(INITIAL_CONNECTION)
  const [log, setLog] = useState<LogEntry[]>([])
  const [baudRate, setBaudRate] = useState<number>(DEFAULT_BAUD_RATE)

  const rawRef = useRef<TelemetryFrame>(ZERO_FRAME)
  const statsRef = useRef<LinkStats>({ ...EMPTY_STATS })
  const lastFrameAtRef = useRef(0)
  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const closingRef = useRef(false)
  const logId = useRef(0)

  const appendLog = useCallback((level: LogLevel, message: string) => {
    const entry: LogEntry = { id: ++logId.current, time: Date.now(), level, message }
    setLog((prev) => {
      const next = prev.length >= MAX_LOG ? prev.slice(prev.length - MAX_LOG + 1) : prev.slice()
      next.push(entry)
      return next
    })
  }, [])

  const clearLog = useCallback(() => setLog([]), [])

  const handleLine = useCallback(
    (line: string) => {
      const parsed = parseLine(line)
      if (parsed.kind === 'frame') {
        rawRef.current = parsed.frame
        statsRef.current.packets += 1
        lastFrameAtRef.current = performance.now()
      } else if (parsed.kind === 'message') {
        appendLog('rx', parsed.text)
      } else if (parsed.text) {
        statsRef.current.parseErrors += 1
        if (statsRef.current.parseErrors % 25 === 1) appendLog('warn', `Unparseable line: ${parsed.text.slice(0, 80)}`)
      }
    },
    [appendLog],
  )

  const readLoop = useCallback(
    async (port: SerialPort) => {
      if (!port.readable) return
      const decoder = new TextDecoder()
      const reader = port.readable.getReader()
      readerRef.current = reader
      let buffer = ''
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (!value) continue
          statsRef.current.bytes += value.length
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() ?? ''
          if (buffer.length > 4096) buffer = ''
          for (const line of lines) handleLine(line)
        }
      } catch (err) {
        if (!closingRef.current) {
          const message = err instanceof Error ? err.message : 'Read failed'
          setConnection({ status: 'error', message })
          appendLog('error', `Stream error: ${message}`)
        }
      } finally {
        reader.releaseLock()
        readerRef.current = null
      }
    },
    [appendLog, handleLine],
  )

  const disconnect = useCallback(async () => {
    const port = portRef.current
    if (!port) {
      setConnection(INITIAL_CONNECTION)
      return
    }
    closingRef.current = true
    await readerRef.current?.cancel().catch(() => {})
    await port.close().catch(() => {})
    portRef.current = null
    closingRef.current = false
    rawRef.current = ZERO_FRAME
    statsRef.current.connectedAt = null
    setConnection(INITIAL_CONNECTION)
    appendLog('info', 'Port closed')
  }, [appendLog])

  const connect = useCallback(async () => {
    if (!navigator.serial) {
      setConnection({ status: 'error', message: 'Web Serial is not supported in this browser' })
      appendLog('error', 'Web Serial API unavailable. Use Chrome, Edge or Opera on desktop.')
      return
    }
    if (portRef.current) return
    setConnection({ status: 'connecting' })
    appendLog('info', `Requesting serial port at ${baudRate} baud…`)
    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate })
      portRef.current = port
      statsRef.current = { ...EMPTY_STATS, connectedAt: Date.now() }
      lastFrameAtRef.current = 0
      port.addEventListener('disconnect', () => {
        portRef.current = null
        rawRef.current = ZERO_FRAME
        setConnection({ status: 'error', message: 'Device unplugged' })
        appendLog('error', 'Device was unplugged')
      })
      const label = describePort(port)
      setConnection({ status: 'connected', message: label })
      appendLog('info', `Connected to ${label} @ ${baudRate} baud`)
      void readLoop(port)
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotFoundError') {
        setConnection(INITIAL_CONNECTION)
        appendLog('warn', 'No port selected')
      } else {
        const message = err instanceof Error ? err.message : 'Unable to open port'
        setConnection({ status: 'error', message })
        appendLog('error', message)
      }
    }
  }, [appendLog, baudRate, readLoop])

  const sendLines = useCallback(
    async (lines: string[]) => {
      const port = portRef.current
      if (!port?.writable) {
        appendLog('warn', 'Not connected — command not sent')
        return false
      }
      const writer = port.writable.getWriter()
      const encoder = new TextEncoder()
      try {
        for (const line of lines) {
          await writer.write(encoder.encode(`${line}\n`))
          appendLog('tx', line)
        }
        return true
      } catch (err) {
        appendLog('error', err instanceof Error ? err.message : 'Write failed')
        return false
      } finally {
        writer.releaseLock()
      }
    },
    [appendLog],
  )

  useEffect(() => {
    return () => {
      closingRef.current = true
      void readerRef.current?.cancel().catch(() => {})
      void portRef.current?.close().catch(() => {})
    }
  }, [])

  return {
    supported,
    connection,
    baudRate,
    setBaudRate,
    connect,
    disconnect,
    sendLines,
    log,
    appendLog,
    clearLog,
    rawRef,
    statsRef,
    lastFrameAtRef,
  }
}

export type SerialDevice = ReturnType<typeof useSerialDevice>
