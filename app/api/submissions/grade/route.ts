// app/api/submissions/grade/route.ts
import { NextResponse } from "next/server"

type GradeBody = {
  submissionId: string
  code?: string
  transcript?: string | null
  lessonTitle: string
  lessonDifficulty: "Beginner" | "Easy" | "Medium" | "Hard" | "Expert"
  lessonCategory: string
}

function coercePct(n: any, fallback = 0) {
  const x = Number(n)
  return Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : fallback
}

function extractJson(text: string) {
  // Try direct parse
  try {
    return JSON.parse(text)
  } catch {}
  // Fallback: grab largest {...} slice
  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")
  if (first !== -1 && last !== -1 && last > first) {
    const slice = text.slice(first, last + 1)
    try {
      return JSON.parse(slice)
    } catch {}
  }
  throw new Error("Could not parse JSON from model output")
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing ANTHROPIC_API_KEY" },
        { status: 500 },
      )
    }

    const {
      submissionId,
      code = "",
      transcript = null,
      lessonTitle,
      lessonDifficulty,
      lessonCategory,
    } = (await req.json()) as GradeBody

    const system = `You are a strict, supportive reviewer for beginner code.
Return ONLY a single JSON object matching this exact TypeScript type:

{
  "id": string,
  "submissionId": string,
  "score": number,               // 0-100
  "confidenceScore": number,     // 0-100
  "isCorrect": boolean,
  "feedback": string,
  "codeAnalysis": { "quality": number, "efficiency": number, "readability": number },
  "audioAnalysis"?: { "clarity": number, "explanation": number, "confidence": number, "transcription": string },
  "createdAt": string            // ISO datetime
}

Rules:
- Keep numbers in 0..100.
- "isCorrect" should be true only if the code clearly solves the prompt for common cases.
- If no transcript is provided, omit "audioAnalysis".
- Keep feedback short, actionable, and beginner-friendly (2–5 sentences).
- Do NOT include extra keys or any prose outside the JSON.`

    const user = `Lesson: ${lessonTitle} [${lessonDifficulty} · ${lessonCategory}]
Student code:
${code || "(none provided)"}
${transcript ? `Spoken explanation:\n${transcript}` : ""}`

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    })

    if (!resp.ok) {
      const t = await resp.text()
      return NextResponse.json(
        { success: false, error: `Claude HTTP ${resp.status}: ${t}` },
        { status: 502 },
      )
    }

    const data = await resp.json()
    const text = String(data?.content?.[0]?.text ?? "")
    const raw = extractJson(text)

    const result = {
      id: raw.id || crypto.randomUUID(),
      submissionId,
      score: coercePct(raw.score, 0),
      confidenceScore: coercePct(raw.confidenceScore, 0),
      isCorrect: Boolean(raw.isCorrect),
      feedback: String(raw.feedback || "Good effort—review the hints and try again."),
      codeAnalysis: {
        quality: coercePct(raw?.codeAnalysis?.quality, 0),
        efficiency: coercePct(raw?.codeAnalysis?.efficiency, 0),
        readability: coercePct(raw?.codeAnalysis?.readability, 0),
      },
      ...(raw.audioAnalysis
        ? {
            audioAnalysis: {
              clarity: coercePct(raw.audioAnalysis.clarity, 0),
              explanation: coercePct(raw.audioAnalysis.explanation, 0),
              confidence: coercePct(raw.audioAnalysis.confidence, 0),
              transcription: String(raw.audioAnalysis.transcription || ""),
            },
          }
        : {}),
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown grading error" },
      { status: 500 },
    )
  }
}
