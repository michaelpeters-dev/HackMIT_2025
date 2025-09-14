// app/api/teacher/chat/route.ts
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Claude API key not configured. Please add ANTHROPIC_API_KEY." },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { message, context } = body

    const WORD_RULES =
      "OUTPUT CONSTRAINTS: Reply in 1–2 sentences, total 20–30 words. No lists/bullets/markdown blocks. No code unless explicitly asked."

    const system = `
You are an expert programming educator and mentor.

${WORD_RULES}
If this is a hint request, give a single gentle nudge, not the solution.
Current lesson: ${context?.lessonTitle || "Programming Practice"}
Lesson description: ${context?.lessonDescription || "Interactive programming assistance"}
`.trim()

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 120,               // ~plenty for 20–30 words
        temperature: 0.5,
        system,
        messages: [
          {
            role: "user",
            content: `${message}\n\n${WORD_RULES}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      return NextResponse.json({ error: `Claude HTTP ${response.status}: ${errorData}` }, { status: 500 })
    }

    const claude = await response.json()
    const aiResponse = claude.content?.[0]?.text || "Sorry, I couldn't generate a response."

    return NextResponse.json({
      message: aiResponse,
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        userId: context?.userId,
        model: "claude-3-5-haiku-20241022",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to process message" }, { status: 500 })
  }
}
