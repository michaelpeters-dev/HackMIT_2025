// app/api/questions/generate/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic" // avoid any caching of POST

type GenBody = {
  topic: string
  difficulty: "Beginner" | "Easy" | "Medium" | "Hard" | "Expert"
  category: string
  context?: string
  count?: number
}

function clampCount(n: any, def = 1) {
  const x = Number(n)
  return Number.isFinite(x) ? Math.max(1, Math.min(5, Math.round(x))) : def
}

function extractJson(text: string) {
  try { return JSON.parse(text) } catch {}
  const a = text.indexOf("{"), b = text.lastIndexOf("}")
  if (a !== -1 && b > a) {
    try { return JSON.parse(text.slice(a, b + 1)) } catch {}
  }
  throw new Error("Could not parse JSON from Claude output")
}

function fallbackQuestions(
  count: number,
  topic: string,
  difficulty: GenBody["difficulty"],
  category: string
) {
  const qs = Array.from({ length: count }).map((_, i) => ({
    title: `${topic} — Practice ${i + 1}`,
    difficulty,
    category,
    description: `A very simple beginner task to practice: ${topic}.`,
    interviewQuestion: `Show one tiny example of "${topic}" in 2–5 lines.`,
    hints: [
      "Start with the most basic syntax.",
      "Use a tiny example (string or small number).",
      "Run it once to verify."
    ],
    expectedApproach: "Use the most direct beginner-friendly code.",
    timeEstimate: "3–8 minutes",
    followUpQuestions: [
      `How else could you show ${topic}?`,
      "What simple mistake should you avoid here?"
    ],
    testCases: [{ input: "example", expectedOutput: "example" }]
  }))
  return { questions: qs }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY" },
        { status: 500 }
      )
    }

    const body = (await req.json()) as GenBody
    const topic = String(body.topic || "").trim()
    const difficulty = body.difficulty || "Beginner"
    const category = String(body.category || "General").trim()
    const context = String(body.context || "").trim()
    const count = clampCount(body.count ?? 1)

    if (!topic) {
      return NextResponse.json(fallbackQuestions(count, "a basic concept", difficulty, category))
    }

    const system = `You are an expert beginner-friendly interview question generator.

Return ONLY a single JSON object with this exact shape:

{
  "questions": [
    {
      "title": "Question Title",
      "difficulty": "Beginner|Easy|Medium|Hard|Expert",
      "category": "category name",
      "description": "very short, beginner-friendly problem description",
      "interviewQuestion": "the simple question to ask",
      "hints": ["hint 1", "hint 2", "hint 3"],
      "expectedApproach": "plain-English description of the simplest solution",
      "timeEstimate": "short estimate (e.g., 3–8 minutes)",
      "followUpQuestions": ["follow-up 1", "follow-up 2"],
      "testCases": [{ "input": "tiny input", "expectedOutput": "tiny output" }]
    }
  ]
}

Rules:
- Target COMPLETE BEGINNERS.
- Exactly ONE skill from the topic.
- Solution should be 2–5 lines max.
- Use tiny/everyday examples (strings, small numbers, printing, simple variables).
- No prose outside JSON; no extra keys.`

    const user = `Generate ${count} beginner interview question(s).

Lesson Topic: ${topic}
Lesson Context: ${context || "No additional context"}
Difficulty: ${difficulty}
Category: ${category}

Requirements:
1) One ultra-simple skill from "${topic}" only
2) 2–5 lines expected solution
3) Valid JSON with the exact schema above`

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: user }],
      }),
      cache: "no-store",
    })

    if (!resp.ok) {
      const t = await resp.text()
      // still return a fallback so the UI always has something to render
      return NextResponse.json(
        fallbackQuestions(count, topic, difficulty, category)
      )
    }

    const data = await resp.json()
    const aiText = String(data?.content?.map?.((b: any) => b?.text ?? "").join("") ?? "").trim()

    let parsed: any
    try {
      parsed = extractJson(aiText)
    } catch {
      parsed = null
    }

    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      parsed = fallbackQuestions(count, topic, difficulty, category)
    }

    // Normalize shape so the client never breaks
    parsed.questions = parsed.questions.map((q: any, i: number) => ({
      title: String(q?.title || `${topic} — Practice ${i + 1}`),
      difficulty: (q?.difficulty as GenBody["difficulty"]) || difficulty,
      category: String(q?.category || category),
      description: String(q?.description || `A very simple beginner task to practice: ${topic}.`),
      interviewQuestion: String(q?.interviewQuestion || `Show one tiny example of "${topic}" in 2–5 lines.`),
      hints: Array.isArray(q?.hints) && q.hints.length ? q.hints.map(String) : [
        "Start with the most basic syntax.",
        "Use a tiny example.",
        "Run it once to verify."
      ],
      expectedApproach: String(q?.expectedApproach || "Use the most direct beginner-friendly code."),
      timeEstimate: String(q?.timeEstimate || "3–8 minutes"),
      followUpQuestions: Array.isArray(q?.followUpQuestions) ? q.followUpQuestions.map(String) : [
        `How else could you show ${topic}?`,
        "What simple mistake should you avoid?"
      ],
      testCases: Array.isArray(q?.testCases) && q.testCases.length
        ? q.testCases.map((t: any) => ({
            input: String(t?.input ?? "example"),
            expectedOutput: String(t?.expectedOutput ?? "example"),
          }))
        : [{ input: "example", expectedOutput: "example" }],
    }))

    return NextResponse.json({
      questions: parsed.questions,
      metadata: {
        timestamp: new Date().toISOString(),
        difficulty,
        category,
        topic,
        context,
        model: "claude-3-5-haiku-20241022",
      },
    })
  } catch (err: any) {
    // Last-resort fallback so UI never stays empty
    return NextResponse.json(
      fallbackQuestions(1, "a basic concept", "Beginner", "General")
    )
  }
}
