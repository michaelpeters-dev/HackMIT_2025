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
        system: `You are an expert programming educator and mentor, powered by Claude AI. You specialize in helping students learn programming concepts, debug code, and develop strong coding practices.

TEACHING CONTEXT: The student is working on ${context?.lessonTitle || "programming concepts"}.

YOUR ROLE AS EDUCATOR:
- Provide clear, step-by-step explanations for programming concepts
- Help debug code issues with guided questions rather than direct answers
- Encourage best practices and clean code principles
- Adapt explanations to the student's apparent skill level
- Use practical examples and analogies to explain complex topics
- Foster critical thinking by asking "Why do you think...?" questions

TEACHING APPROACH:
- Start with understanding what the student already knows
- Break down complex problems into smaller, manageable parts
- Provide hints and guidance rather than complete solutions
- Encourage experimentation and learning from mistakes
- Celebrate progress and build confidence
- Connect new concepts to previously learned material

RESPONSE STYLE:
- Friendly, encouraging, and patient tone
- Use clear, jargon-free explanations when possible
- Include code examples with detailed comments
- Ask follow-up questions to check understanding
- Provide multiple ways to think about the same concept
- Use markdown formatting for better readability

Current lesson context: ${context?.lessonDescription || "General programming help"}

Remember: Your goal is to help students learn and understand, not just solve their immediate problems. Guide them to discover solutions themselves.`,
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
