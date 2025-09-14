import { useCallback, useEffect, useState } from "react"
import type { SubmissionResult, KeystrokeData } from "../types/api"
import { lessons as staticLessons } from "../data/lessons"

type SubmitArgs = {
  lessonId: number
  lessonTitle: string
  lessonDifficulty: "Beginner" | "Easy" | "Medium" | "Hard" | "Expert"
  lessonCategory: string
  code: string
  transcription?: string
  keystrokes?: KeystrokeData[]
  audioRecording?: Blob
}

export function useSubmission() {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearResult = useCallback(() => setResult(null), [])

  const submitSolution = useCallback(async (args: SubmitArgs) => {
    setSubmitting(true)
    setError(null)
    setResult(null)

    const submissionId = crypto.randomUUID()

    try {
      const res = await fetch("/api/submissions/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submissionId,
          code: args.code,
          transcript: args.transcription ?? null,
          lessonTitle: args.lessonTitle,
          lessonDifficulty: args.lessonDifficulty,
          lessonCategory: args.lessonCategory,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Grade HTTP ${res.status}`)
      }
      setResult(json.data as SubmissionResult)
    } catch (e: any) {
      setError(e?.message || "Failed to submit solution")
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { submitSolution, submitting, result, error, clearResult }
}

// <<< add this >>>
export function useLessons() {
  const [lessons, setLessons] = useState(staticLessons)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If later you fetch from an API, you can flip loading here.
  useEffect(() => {
    setLessons(staticLessons)
  }, [])

  return { lessons, loading, error }
}
