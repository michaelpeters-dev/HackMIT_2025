import { type NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Keystroke analysis API called")

    const { keystrokes, metrics, currentCode, context, aiConfig } = await request.json()

    console.log("[v0] Request data received:", {
      keystrokesLength: keystrokes?.length,
      metricsExists: !!metrics,
      currentCodeLength: currentCode?.length,
      contextExists: !!context,
      aiConfigExists: !!aiConfig,
    })

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("[v0] ANTHROPIC_API_KEY not found")
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 })
    }

    if (!metrics || !metrics.recentActivity || !metrics.sessionOverall || !metrics.patterns) {
      console.log("[v0] Invalid metrics data:", metrics)
      return NextResponse.json({ error: "Invalid metrics data" }, { status: 400 })
    }

    // Create a detailed prompt for Claude to analyze the keystroke patterns
    const prompt = `You are an expert technical interview coach analyzing a candidate's real-time coding behavior. Based on the keystroke data and metrics below, provide insightful, encouraging feedback that would help them improve their interview performance.

CURRENT CONTEXT:
- Lesson: ${context.lessonTitle}
- Session Duration: ${Math.round(context.sessionDuration / 1000)}s
- Current Code Length: ${currentCode.length} characters

RECENT ACTIVITY (Last 10 seconds):
- Typing Speed: ${metrics.recentActivity.typingSpeed.toFixed(1)} chars/min
- Error Rate: ${(metrics.recentActivity.errorRate * 100).toFixed(1)}%
- Corrections: ${metrics.recentActivity.backspaceCount} backspaces, ${metrics.recentActivity.deleteCount} deletes
- Navigation: ${metrics.recentActivity.arrowKeys} arrow keys, ${metrics.recentActivity.homeEndKeys} home/end
- Code Elements: ${metrics.recentActivity.brackets} brackets, ${metrics.recentActivity.symbols} symbols
- Long Pauses: ${metrics.recentActivity.longPauses} (>3s)
- Total Keystrokes: ${metrics.recentActivity.keystrokeCount}

SESSION OVERVIEW:
- Average Speed: ${metrics.sessionOverall.averageTypingSpeed.toFixed(1)} chars/min
- Total Keystrokes: ${metrics.sessionOverall.totalKeystrokes}
- Total Corrections: ${metrics.sessionOverall.totalBackspaces}
- Total Pauses: ${metrics.sessionOverall.totalPauses}

BEHAVIOR PATTERNS:
- Is Typing Code: ${metrics.patterns.isTypingCode}
- Is Navigating: ${metrics.patterns.isNavigating}
- Is Correcting: ${metrics.patterns.isCorrecting}
- Is Pausing to Think: ${metrics.patterns.isPausing}
- Is Actively Typing: ${metrics.patterns.isActivelyTyping}

CURRENT CODE SNIPPET:
\`\`\`
${currentCode.slice(-200)} // Last 200 characters
\`\`\`

Provide specific, actionable feedback as a technical interview coach would. Focus on:
1. What they're doing well
2. Areas for improvement
3. Interview-specific tips
4. Encouragement and next steps

Keep the response concise (2-3 sentences) and supportive. Use a conversational tone as if speaking directly to the candidate during a practice session.`

    console.log("[v0] Making request to Claude API")

    const message = await anthropic.messages.create({
      model: aiConfig.model || "claude-3-5-haiku-20241022",
      max_tokens: aiConfig.maxTokens || 800,
      temperature: aiConfig.temperature || 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const feedback = message.content[0]?.type === "text" ? message.content[0].text : ""

    console.log("[v0] Claude API response received, feedback length:", feedback.length)

    return NextResponse.json({
      feedback,
      analysis: {
        metrics,
        patterns: metrics.patterns,
        recommendations: {
          focusArea: metrics.patterns.isCorrecting
            ? "accuracy"
            : metrics.patterns.isPausing
              ? "confidence"
              : "momentum",
          strength:
            metrics.recentActivity.typingSpeed > 60
              ? "speed"
              : metrics.patterns.isTypingCode
                ? "structure"
                : "thinking",
        },
      },
    })
  } catch (error) {
    console.error("[v0] Keystroke analysis error:", error)

    if (error instanceof Error && error.message.includes("api_key")) {
      return NextResponse.json({ error: "Invalid or missing ANTHROPIC_API_KEY" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to analyze keystrokes" }, { status: 500 })
  }
}
