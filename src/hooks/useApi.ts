"use client"

import { useState, useEffect, useCallback } from "react"
import { apiService } from "../services/api"
import type { Lesson, User, SubmissionResult, KeystrokeData } from "../types/api"

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiService.getLessons(1, 100) // Get all lessons
      setLessons(response.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lessons")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLessons()
  }, [fetchLessons])

  return { lessons, loading, error, refetch: fetchLessons }
}

export function useLesson(id: number) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLesson() {
      try {
        setLoading(true)
        const response = await apiService.getLesson(id)
        setLesson(response.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch lesson")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchLesson()
    }
  }, [id])

  return { lesson, loading, error }
}

export function useSubmission() {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submitSolution = useCallback(
    async (data: {
      lessonId: number
      code: string
      audioRecording?: Blob
      transcription?: string
      keystrokes?: KeystrokeData[]
    }) => {
      try {
        setSubmitting(true)
        setError(null)
        setResult(null)

        console.log("[v0] Submitting solution with data:", {
          lessonId: data.lessonId,
          codeLength: data.code?.length || 0,
          hasAudio: !!data.audioRecording,
          hasTranscription: !!data.transcription,
          keystrokeCount: data.keystrokes?.length || 0,
        })

        const response = await apiService.submitSolution(data)

        console.log("[v0] Submission response:", response)

        if (response.success && response.data) {
          setResult(response.data as SubmissionResult)
          console.log("[v0] Result set successfully:", response.data)
        } else {
          throw new Error(response.error || "Failed to get evaluation result")
        }
      } catch (err) {
        console.error("[v0] Submission error:", err)
        setError(err instanceof Error ? err.message : "Failed to submit solution")
      } finally {
        setSubmitting(false)
      }
    },
    [],
  )

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { submitSolution, submitting, result, error, clearResult }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true)
        const response = await apiService.getCurrentUser()
        setUser(response.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading, error }
}
