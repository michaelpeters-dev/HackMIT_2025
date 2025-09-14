// app/api/teacher/keystroke-analysis/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 })
    }

    const { keystrokes = [], context = {}, aiConfig = {} } = await req.json()

    const stats = (() => {
      const t = keystrokes
      const chars = t.filter((k: any) => String(k.key).length === 1).length
      const back = t.filter((k: any) => k.key === "Backspace").length
      const span =
        t.length > 1 ? (t[t.length - 1].timestamp - t[0].timestamp) / 1000 : 45
      const wpm = Math.max(0, Math.round((chars / 5) / (span / 60)))
      return `WPM≈${wpm}, corrections=${back}, window≈${Math.round(span)}s`
    })()

    const WORD_RULES =
      "Reply in 1–2 sentences, total 20–30 words. No lists/bullets/markdown. Plain sentence only."

    const system = `
You analyze live coding keystrokes and give one concise, actionable tip.

${WORD_RULES}
Focus on pacing, accuracy, or editor flow. Avoid generic platitudes.
`.trim()

    const user = `
Lesson: ${context.lessonTitle || "Programming Practice"}
Desc: ${context.lessonDescription || "Interactive programming assistance"}
Window: ${context.analysisWindow || "45 seconds"}
Stats: ${stats}
Generate one practical insight the learner can apply immediately.
`.trim()

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: aiConfig.model || "claude-3-5-haiku-20241022",
        max_tokens: Math.min(120, aiConfig.maxTokens || 120),
        temperature: aiConfig.temperature ?? 0.3,
        system,
        messages: [{ role: "user", content: `${user}\n\n${WORD_RULES}` }],
      }),
    })

    if (!resp.ok) {
      const t = await resp.text()
      return NextResponse.json({ error: `Claude HTTP ${resp.status}: ${t}` }, { status: 502 })
    }

    const data = await resp.json()
    const analysis = String(data?.content?.[0]?.text ?? "").trim()
    return NextResponse.json({ analysis })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "analysis failed" }, { status: 500 })
  }
}
