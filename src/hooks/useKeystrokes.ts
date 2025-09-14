"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { KeystrokeData } from "../types/api"

export function useKeystrokes() {
  const [keystrokes, setKeystrokes] = useState<KeystrokeData[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const startTimeRef = useRef<number>(0)

  const startTracking = useCallback(() => {
    setKeystrokes([])
    setIsTracking(true)
    startTimeRef.current = Date.now()
    console.log("[v0] Keystroke tracking started")
  }, [])

  const stopTracking = useCallback(() => {
    setIsTracking(false)
    console.log("[v0] Keystroke tracking stopped")
  }, [])

  const clearKeystrokes = useCallback(() => {
    setKeystrokes([])
  }, [])

  useEffect(() => {
    if (!isTracking) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const keystroke: KeystrokeData = {
        timestamp: Date.now(), // Use absolute timestamp for real-time analysis
        key: event.key,
        action: "keydown",
        code: event.code,
      }
      setKeystrokes((prev) => [...prev, keystroke])
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const keystroke: KeystrokeData = {
        timestamp: Date.now(), // Use absolute timestamp for real-time analysis
        key: event.key,
        action: "keyup",
        code: event.code,
      }
      setKeystrokes((prev) => [...prev, keystroke])
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
    }
  }, [isTracking])

  return {
    keystrokes,
    isTracking,
    startTracking,
    stopTracking,
    clearKeystrokes,
  }
}
