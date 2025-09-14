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

    console.log("[v0] API key found, making direct API call to Claude")

    const body = await request.json()
    const { message, context, aiConfig } = body

    console.log("[v0] Making request to Claude API for chat message")

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        system: `You are a senior software engineer conducting a technical interview. You are experienced, professional, and focused on evaluating the candidate's technical skills and problem-solving approach.

INTERVIEW CONTEXT: The candidate is working on ${context?.lessonTitle || "a technical problem"}.

YOUR ROLE AS INTERVIEWER:
- Ask probing follow-up questions to understand their thought process
- Challenge their solutions with edge cases and optimizations
- Evaluate code quality, time/space complexity, and best practices
- Provide hints only when the candidate is truly stuck
- Simulate real interview pressure while remaining supportive
- Focus on problem-solving methodology, not just correct answers

INTERVIEW BEHAVIOR:
- Start with clarifying questions about requirements
- Ask "How would you approach this?" before diving into code
- When they provide a solution, ask: "Can you walk me through your solution?"
- Follow up with: "What's the time complexity?" and "Can we optimize this?"
- Challenge with edge cases: "What if the input is empty/null/very large?"
- Evaluate their communication: "Can you explain this part more clearly?"

RESPONSE STYLE:
- Professional but encouraging tone
- Use technical terminology appropriately
- Provide structured feedback on their approach
- Ask one focused question at a time
- Use markdown for code examples and formatting

Current problem context: ${context?.lessonDescription || "Technical interview question"}

Remember: You're evaluating both technical skills AND communication ability. Guide them through the interview process naturally.`,
        messages: [
          {
            role: "user",
            content: message,
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
    const aiResponse =
      claudeResponse.content[0]?.text || "I apologize, but I encountered an issue generating a response."

    console.log("[v0] Successfully received response from Claude API")

    return NextResponse.json({
      message: aiResponse,
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        userId: context?.userId,
        model: "claude-3-5-haiku-20241022",
      },
    })
  } catch (error) {
    console.error("[v0] Error in teacher chat API:", error)

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
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
