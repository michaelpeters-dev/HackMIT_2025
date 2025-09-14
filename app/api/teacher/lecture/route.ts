import { type NextRequest, NextResponse } from "next/server"

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`[v0] Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms delay`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

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
    const { lessonId, lessonTitle, lessonDescription, context } = body

    console.log("[v0] Making request to Claude API for lesson:", lessonTitle)

    const claudeResponse = await retryWithBackoff(
      async () => {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 2000,
            system: `You are an expert programming educator. Generate comprehensive, structured lecture content for programming concepts.

Your response must be a valid JSON object with this exact structure:
{
  "title": "lesson title",
  "introduction": "engaging introduction paragraph",
  "concepts": ["concept 1", "concept 2", "concept 3", "concept 4", "concept 5"],
  "examples": [
    {
      "title": "Example Title",
      "code": "code example here",
      "explanation": "clear explanation of the code"
    }
  ],
  "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"]
}

Make the content educational, practical, and suitable for beginners to intermediate learners.`,
            messages: [
              {
                role: "user",
                content: `Generate comprehensive lecture content for: "${lessonTitle}"

Description: ${lessonDescription}

Please provide:
1. An engaging introduction
2. 5 key concepts to cover
3. 3-4 practical code examples with explanations
4. 5 important key points to remember

Focus on practical programming skills and real-world applications.`,
              },
            ],
          }),
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error("[v0] Claude API error:", response.status, errorData)
          throw new Error(`HTTP ${response.status}: ${errorData}`)
        }

        return await response.json()
      },
      3,
      1000,
    ) // 3 retries with 1s base delay

    const aiResponse = claudeResponse.content[0]?.text || "{}"
    console.log("[v0] Received response from Claude API")

    let lectureData
    try {
      lectureData = JSON.parse(aiResponse)
      console.log("[v0] Successfully parsed Claude response")
    } catch (parseError) {
      console.error("[v0] Failed to parse Claude response:", parseError)
      // Fallback structure if parsing fails
      lectureData = {
        title: lessonTitle,
        introduction: `Welcome to the lesson on ${lessonTitle}. This is a fundamental concept in programming.`,
        concepts: [
          "Understanding the basics",
          "Practical applications",
          "Best practices",
          "Common patterns",
          "Advanced techniques",
        ],
        examples: [
          {
            title: "Basic Example",
            code: `# Example for ${lessonTitle}\nprint("Learning ${lessonTitle}")`,
            explanation: "This is a basic example to get you started.",
          },
        ],
        keyPoints: [
          "Practice regularly",
          "Start with simple examples",
          "Build complexity gradually",
          "Apply what you learn",
          "Ask questions when stuck",
        ],
      }
    }

    return NextResponse.json({
      lectureContent: lectureData,
      metadata: {
        timestamp: new Date().toISOString(),
        lessonId,
        lessonTitle,
        model: "claude-3-5-haiku-20241022",
      },
    })
  } catch (error) {
    console.error("[v0] Error generating lecture content:", error)

    if (error instanceof Error) {
      if (
        error.message.includes("upstream connect error") ||
        error.message.includes("connection termination") ||
        error.message.includes("503")
      ) {
        return NextResponse.json(
          {
            error: "Claude API is temporarily unavailable. Please try again in a moment.",
            details: "The Claude API service is experiencing connectivity issues. This is usually temporary.",
          },
          { status: 503 },
        )
      }

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
        error: "Failed to generate lecture content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
