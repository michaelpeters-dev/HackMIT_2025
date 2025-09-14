import { type NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface KeystrokeData {
  key: string
  timestamp: number
  code?: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Keystroke analysis API called")
    const { keystrokes, context, aiConfig } = await request.json()

    console.log("[v0] Received data:", {
      keystrokesLength: keystrokes?.length,
      contextKeys: Object.keys(context || {}),
      aiConfigKeys: Object.keys(aiConfig || {}),
    })

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("[v0] Missing ANTHROPIC_API_KEY")
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 })
    }

    if (!keystrokes || !Array.isArray(keystrokes) || keystrokes.length === 0) {
      console.log("[v0] Invalid keystrokes data:", keystrokes)
      return NextResponse.json({ error: "Invalid keystrokes data" }, { status: 400 })
    }

    const validKeystrokes = keystrokes.filter(
      (k: any) => k && typeof k === "object" && k.key && typeof k.timestamp === "number",
    )

    if (validKeystrokes.length === 0) {
      console.log("[v0] No valid keystrokes found")
      return NextResponse.json({ error: "No valid keystrokes found" }, { status: 400 })
    }

    console.log("[v0] Processing", validKeystrokes.length, "valid keystrokes")

    // Calculate detailed keystroke metrics
    const typingKeys = validKeystrokes.filter((k: KeystrokeData) => k.key.length === 1)
    const backspaces = validKeystrokes.filter((k: KeystrokeData) => k.key === "Backspace")
    const specialKeys = validKeystrokes.filter((k: KeystrokeData) =>
      ["Tab", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k.key),
    )

    // Calculate timing patterns
    const timings = validKeystrokes
      .map((k: KeystrokeData, i: number) => (i > 0 ? k.timestamp - validKeystrokes[i - 1].timestamp : 0))
      .filter((t) => t > 0)

    const avgTimeBetweenKeys = timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 0
    const longPauses = timings.filter((t) => t > 2000).length
    const rapidBursts = timings.filter((t) => t < 100).length

    // Calculate WPM (assuming average word length of 5 characters)
    const timeSpanSeconds =
      validKeystrokes.length > 1
        ? (validKeystrokes[validKeystrokes.length - 1].timestamp - validKeystrokes[0].timestamp) / 1000
        : 30
    const wpm = Math.round(typingKeys.length / 5 / (timeSpanSeconds / 60))

    // Analyze key frequency patterns
    const keyFrequency: { [key: string]: number } = {}
    typingKeys.forEach((k: KeystrokeData) => {
      keyFrequency[k.key.toLowerCase()] = (keyFrequency[k.key.toLowerCase()] || 0) + 1
    })

    const mostUsedKeys = Object.entries(keyFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, count]) => `${key}(${count})`)

    // Calculate error correction patterns
    const errorRate = typingKeys.length > 0 ? backspaces.length / typingKeys.length : 0

    const prompt = `You are an expert typing and coding interview coach analyzing a programmer's keystroke patterns during a technical interview practice session.

**KEYSTROKE DATA ANALYSIS:**
- Total keystrokes: ${validKeystrokes.length}
- Typing keys: ${typingKeys.length}
- Backspaces/corrections: ${backspaces.length}
- Special keys (Tab, Enter, arrows): ${specialKeys.length}
- Calculated WPM: ${wpm}
- Error correction rate: ${Math.round(errorRate * 100)}%
- Average time between keys: ${Math.round(avgTimeBetweenKeys)}ms
- Long pauses (>2s): ${longPauses}
- Rapid bursts (<100ms): ${rapidBursts}
- Most used keys: ${mostUsedKeys.join(", ")}

**CONTEXT:**
- Lesson: ${context.lessonTitle}
- Analysis window: ${context.analysisWindow}
- Current session: Technical interview preparation

**INSTRUCTIONS:**
Provide a comprehensive analysis in 2-3 sentences focusing on:

1. **Typing Speed Assessment**: Comment on their ${wpm} WPM speed in context of technical interviews (25-40 WPM is typical for coding)

2. **Error Patterns & Efficiency**: Analyze their ${Math.round(errorRate * 100)}% error rate and correction patterns. Are they making thoughtful corrections or hasty mistakes?

3. **Coding Flow Analysis**: Based on pauses (${longPauses} long pauses) and rapid bursts (${rapidBursts}), assess their problem-solving rhythm

4. **Key Usage Insights**: Comment on their most frequent keys and what this suggests about their coding approach

5. **Interview-Specific Advice**: Provide 1-2 specific tips for technical interviews based on their typing patterns

**RESPONSE FORMAT:**
Start with "**Keystroke Analysis:**" followed by your insights. Be encouraging but specific. Focus on actionable interview advice.

**EXAMPLE GOOD RESPONSE:**
**Keystroke Analysis:** Your ${wpm} WPM typing speed is excellent for technical interviews - you're maintaining good momentum without sacrificing accuracy. I notice ${longPauses} thoughtful pauses which shows you're planning before coding (great interview technique!). Your ${Math.round(errorRate * 100)}% correction rate suggests careful coding. **Interview Tip:** Keep verbalizing during those thinking pauses - tell the interviewer "I'm considering edge cases" or "Let me think about the optimal approach here."

Keep response under 150 words and always include specific numbers from the analysis.`

    console.log("[v0] Making request to Claude API for keystroke analysis")

    const message = await anthropic.messages.create({
      model: aiConfig.model || "claude-3-5-haiku-20241022",
      max_tokens: aiConfig.maxTokens || 800,
      temperature: aiConfig.temperature || 0.3,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const analysis = message.content[0].type === "text" ? message.content[0].text : "Analysis unavailable"

    console.log("[v0] Received keystroke analysis from Claude API")

    return NextResponse.json({
      analysis,
      metrics: {
        wpm,
        errorRate: Math.round(errorRate * 100),
        totalKeystrokes: validKeystrokes.length,
        corrections: backspaces.length,
        longPauses,
        rapidBursts,
        mostUsedKeys,
      },
    })
  } catch (error) {
    console.error("[v0] Error in keystroke analysis:", error)

    if (error instanceof Error && error.message.includes("api_key")) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured properly" }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to analyze keystrokes" }, { status: 500 })
  }
}
