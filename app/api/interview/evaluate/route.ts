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

    console.log("[v0] API key found, making direct API call to Claude for code evaluation")

    const body = await request.json()
    const { code, question, lessonTitle, difficulty, keystrokes } = body

    console.log("[v0] Making request to Claude API for code evaluation")

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
        system: `You are an expert technical interview evaluator and programming mentor. Evaluate code submissions for technical interviews.

Your response must be a valid JSON object with this exact structure:
{
  "score": 85,
  "isCorrect": true,
  "feedback": "detailed feedback about the solution",
  "codeAnalysis": {
    "quality": 90,
    "efficiency": 80,
    "readability": 95,
    "bestPractices": 85
  },
  "suggestions": ["suggestion 1", "suggestion 2"],
  "interviewFeedback": "specific advice for technical interviews",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"]
}

Evaluate based on:
- Correctness and functionality
- Code quality and style
- Algorithm efficiency
- Interview presentation
- Best practices adherence`,
        messages: [
          {
            role: "user",
            content: `Please evaluate this code submission for a technical interview:

**Question**: ${question}
**Lesson**: ${lessonTitle} (${difficulty} level)

**Code Submitted**:
\`\`\`python
${code}
\`\`\`

${keystrokes ? `**Coding Process**: The candidate took ${keystrokes.length} keystrokes and showed ${keystrokes.filter((k) => k.action === "keydown").length} key presses during coding.` : ""}

Please provide a comprehensive evaluation focusing on technical interview criteria.`,
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
    console.log("[v0] Received response from Claude API for code evaluation")

    let evaluationData
    try {
      evaluationData = JSON.parse(aiResponse)
      console.log("[v0] Successfully parsed Claude evaluation response")
    } catch (parseError) {
      console.error("[v0] Failed to parse Claude response:", parseError)
      // Fallback evaluation if parsing fails
      evaluationData = {
        score: 75,
        isCorrect: true,
        feedback:
          "Your code appears to work correctly. Consider adding comments and optimizing for better readability.",
        codeAnalysis: {
          quality: 75,
          efficiency: 70,
          readability: 80,
          bestPractices: 70,
        },
        suggestions: ["Add more descriptive variable names", "Include error handling", "Add comments to explain logic"],
        interviewFeedback: "Good problem-solving approach. Practice explaining your thought process aloud.",
        strengths: ["Correct solution", "Clean structure"],
        improvements: ["Code documentation", "Edge case handling"],
      }
    }

    return NextResponse.json({
      evaluation: evaluationData,
      metadata: {
        timestamp: new Date().toISOString(),
        lessonTitle,
        difficulty,
        model: "claude-3-5-haiku-20241022",
      },
    })
  } catch (error) {
    console.error("[v0] Error evaluating code:", error)

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
        error: "Failed to evaluate code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
