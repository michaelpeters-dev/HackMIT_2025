"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type KeystrokeData = {
  timestamp: number
  key: string
  action: "keydown" | "keyup"
  code: string
}

type Options = {
  /**
   * Maximum number of events to keep in memory (rolling buffer)
   */
  maxBuffer?: number
  /**
   * Whether to ignore modifier-only keys like Shift, Alt, Control, Meta
   */
  ignorePureModifiers?: boolean
}

const MODIFIERS = new Set(["Shift", "Alt", "Control", "Meta"])

export function useKeystrokes(opts: Options = {}) {
  const { maxBuffer = 2000, ignorePureModifiers = true } = opts

  const [isTracking, setIsTracking] = useState(false)
  const [keystrokes, setKeystrokes] = useState<KeystrokeData[]>([])
  const bufferRef = useRef<KeystrokeData[]>([])
  const trackingRef = useRef(false)

  const push = (e: KeyboardEvent, action: "keydown" | "keyup") => {
    if (ignorePureModifiers && MODIFIERS.has(e.key)) return

    const event: KeystrokeData = {
      timestamp: Date.now(),
      key: e.key,
      action,
      code: e.code || "",
    }

    const buf = bufferRef.current
    buf.push(event)
    if (buf.length > maxBuffer) buf.splice(0, buf.length - maxBuffer)
  }

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return
    setKeystrokes((prev) => {
      const next = prev.concat(bufferRef.current)
      bufferRef.current = []
      // keep result bounded too
      if (next.length > maxBuffer) {
        return next.slice(next.length - maxBuffer)
      }
      return next
    })
  }, [maxBuffer])

  const keydown = useCallback((e: KeyboardEvent) => push(e, "keydown"), [])
  const keyup = useCallback((e: KeyboardEvent) => push(e, "keyup"), [])

  const startTracking = useCallback(() => {
    if (trackingRef.current) return
    trackingRef.current = true
    setIsTracking(true)
    window.addEventListener("keydown", keydown, { capture: true })
    window.addEventListener("keyup", keyup, { capture: true })
  }, [keydown, keyup])

  const stopTracking = useCallback(() => {
    if (!trackingRef.current) return
    trackingRef.current = false
    setIsTracking(false)
    window.removeEventListener("keydown", keydown, { capture: true } as any)
    window.removeEventListener("keyup", keyup, { capture: true } as any)
    // final flush
    flush()
  }, [keydown, keyup, flush])

  // periodic flush to move events from bufferRef -> state
  useEffect(() => {
    const t = setInterval(flush, 500) // low overhead
    return () => clearInterval(t)
  }, [flush])

  return {
    keystrokes,
    isTracking,
    startTracking,
    stopTracking,
    clear: () => setKeystrokes([]),
  }
}
