// app/api/teacher/keystroke-analysis/route.ts
import { NextResponse } from "next/server"

type Keystroke = {
  timestamp: number
  key: string
  action: "keydown" | "keyup"
  code: string
}

type Body = {
  keystrokes: Keystroke[]
  context?: {
    lessonTitle?: string
    lessonDescription?: string
    analysisWindow?: string
    totalKeystrokes?: number
  }
  aiConfig?: {
    model?: string
    maxTokens?: number
    temperature?: number
  }
}

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY" },
        { status: 500 }
      )
    }

    const body = (await req.json()) as Body
    const strokes = Array.isArray(body?.keystrokes) ? body.keystrokes : []
    if (strokes.length === 0) {
      return NextResponse.json({ analysis: "" })
    }

    // summarize a few basic metrics to give Claude something structured
    const typingKeys = strokes.filter((k) => k.key.length === 1)
    const backspaces = strokes.filter((k) => k.key === "Backspace")
    const specialKeys = strokes.filter((k) =>
      ["Tab", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k.key)
    )

    const timings = strokes
      .map((k, i) => (i > 0 ? k.timestamp - strokes[i - 1].timestamp : 0))
      .filter((t) => t > 0 && t < 10000)
    const avgMs = timings.length ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0
    const longPauses = timings.filter((t) => t > 3000).length
    const rapidBursts = timings.filter((t) => t < 150).length

    const seconds =
      strokes.length > 1 ? (strokes[strokes.length - 1].timestamp - strokes[0].timestamp) / 1000 : 45
    const wpm = Math.max(0, Math.round(typingKeys.length / 5 / (seconds / 60)))
    const errorRate = typingKeys.length ? Math.min(1, backspaces.length / typingKeys.length) : 0

    const lessonTitle = body?.context?.lessonTitle || "Programming Practice"

    const system = `You are a supportive *technical interview coach*.
You receive keystroke telemetry and must return **one short markdown paragraph** of constructive, specific feedback.
- Focus on process: rhythm, pauses, corrections, flow, and problem-solving approach.
- Keep it beginner-friendly, positive, and actionable.
- 2–5 sentences. Avoid generic platitudes.
- If appropriate, offer one tiny next step (a hint), not a full solution.
Return ONLY the paragraph (markdown allowed).`

    const user = `Lesson: ${lessonTitle}
Window: ${body?.context?.analysisWindow || "recent activity"}
Keystroke summary:
- total: ${strokes.length}
- typing chars: ${typingKeys.length}
- backspaces: ${backspaces.length}
- special keys (tab/enter/arrows): ${specialKeys.length}
- avg ms between keys: ${avgMs}
- long pauses (>3000ms): ${longPauses}
- rapid bursts (<150ms): ${rapidBursts}
- estimated WPM: ${wpm}
- error rate: ${Math.round(errorRate * 100)}%

Based on this, give precise feedback about pacing, confidence, and next step. Do not include JSON.`

    const model = body?.aiConfig?.model || "claude-3-5-haiku-20241022"
    const max_tokens = body?.aiConfig?.maxTokens ?? 400
    const temperature = body?.aiConfig?.temperature ?? 0.3

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system,
        messages: [{ role: "user", content: user }],
        temperature,
      }),
      cache: "no-store",
    })

    if (!resp.ok) {
      const t = await resp.text()
      // On failure, return empty analysis so client can fall back locally
      return NextResponse.json({ analysis: "", error: `Claude HTTP ${resp.status}: ${t}` }, { status: 200 })
    }

    const data = await resp.json()
    const text =
      Array.isArray(data?.content)
        ? data.content.map((b: any) => b?.text ?? "").join("").trim()
        : String(data?.content?.[0]?.text ?? "").trim()

    // Keep it short on our end as a second guard
    const clipped = text.length > 600 ? text.slice(0, 600) : text

    return NextResponse.json({ analysis: clipped })
  } catch (err: any) {
    return NextResponse.json({ analysis: "", error: err?.message || "Unknown error" }, { status: 200 })
  }
}
