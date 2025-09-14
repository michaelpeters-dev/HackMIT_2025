import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.error("[v0] ANTHROPIC_API_KEY environment variable is not set")
      return NextResponse.json(
        {
          error: "Claude API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.",
          details: "The ANTHROPIC_API_KEY environment variable is missing from your deployment.",
        },
        { status: 500 },
      )
    }

    console.log("[v0] API key found, making direct API call to Claude for interview feedback")

    const body = await request.json()
    const { keystrokes, timeSpent, code, question, lessonTitle, audioTranscription } = body

    console.log("[v0] Making request to Claude API for interview feedback analysis")

    // Analyze keystroke patterns
    const keystrokeAnalysis = keystrokes
      ? {
          totalKeystrokes: keystrokes.length,
          backspaces: keystrokes.filter((k: any) => k.key === "Backspace").length,
          pauses: keystrokes.filter((k: any, i: number) => i > 0 && k.timestamp - keystrokes[i - 1].timestamp > 3000)
            .length,
          typingSpeed: keystrokes.length / (timeSpent / 60), // keystrokes per minute
        }
      : null

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1500,
        system: `You are an expert technical interview coach analyzing candidate performance. Provide detailed feedback on interview behavior and coding approach.

Your response must be a valid JSON object with this exact structure:
{
  "overallScore": 85,
  "interviewPerformance": {
    "problemSolving": 90,
    "communication": 80,
    "codingStyle": 85,
    "timeManagement": 75
  },
  "behaviorAnalysis": {
    "confidence": "High|Medium|Low",
    "approach": "description of problem-solving approach",
    "thinkingProcess": "analysis of thinking patterns"
  },
  "feedback": "comprehensive interview feedback",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "interviewTips": ["tip 1", "tip 2", "tip 3"],
  "nextSteps": "recommended next steps for improvement"
}

Focus on interview-specific skills like communication, problem-solving approach, and professional behavior.`,
        messages: [
          {
            role: "user",
            content: `Please analyze this technical interview performance:

**Question**: ${question}
**Lesson**: ${lessonTitle}
**Time Spent**: ${timeSpent} seconds

**Code Solution**:
\`\`\`python
${code}
\`\`\`

${
  keystrokeAnalysis
    ? `**Coding Behavior Analysis**:
- Total keystrokes: ${keystrokeAnalysis.totalKeystrokes}
- Backspaces/corrections: ${keystrokeAnalysis.backspaces}
- Long pauses (>3s): ${keystrokeAnalysis.pauses}
- Typing speed: ${keystrokeAnalysis.typingSpeed.toFixed(1)} keystrokes/minute`
    : ""
}

${audioTranscription ? `**Verbal Communication**: ${audioTranscription}` : ""}

Please provide comprehensive interview performance feedback focusing on technical interview skills.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("[v0] Claude API error:", response.status, errorData)
      return NextResponse.json(
        {
          error: "Claude API request failed",
          details: `HTTP ${response.status}: ${errorData}`,
        },
        { status: 500 },
      )
    }

    const claudeResponse = await response.json()
    const aiResponse = claudeResponse.content[0]?.text || "{}"
    console.log("[v0] Received response from Claude API for interview feedback")

    let feedbackData
    try {
      feedbackData = JSON.parse(aiResponse)
      console.log("[v0] Successfully parsed Claude feedback response")
    } catch (parseError) {
      console.error("[v0] Failed to parse Claude response:", parseError)
      // Fallback feedback if parsing fails
      feedbackData = {
        overallScore: 75,
        interviewPerformance: {
          problemSolving: 80,
          communication: 70,
          codingStyle: 75,
          timeManagement: 70,
        },
        behaviorAnalysis: {
          confidence: "Medium",
          approach: "Systematic problem-solving approach",
          thinkingProcess: "Shows logical thinking with room for improvement in communication",
        },
        feedback: "Good technical solution with opportunities to improve interview communication skills.",
        strengths: ["Correct solution", "Logical approach"],
        improvements: ["Explain thinking process aloud", "Ask clarifying questions"],
        interviewTips: [
          "Verbalize your thought process",
          "Ask questions about requirements",
          "Test your solution with examples",
        ],
        nextSteps: "Practice explaining your code and approach out loud during problem solving.",
      }
    }

    return NextResponse.json({
      feedback: feedbackData,
      behaviorMetrics: keystrokeAnalysis,
      metadata: {
        timestamp: new Date().toISOString(),
        lessonTitle,
        timeSpent,
        model: "claude-3-5-haiku-20241022",
      },
    })
  } catch (error) {
    console.error("[v0] Error generating interview feedback:", error)

    if (error instanceof Error) {
      if (error.message.includes("api_key") || error.message.includes("authentication")) {
        return NextResponse.json(
          {
            error: "Claude API key authentication failed. Please check your ANTHROPIC_API_KEY.",
            details: error.message,
          },
          { status: 500 },
        )
      }

      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again in a moment.",
            details: error.message,
          },
          { status: 429 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate interview feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
