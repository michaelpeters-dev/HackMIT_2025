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

    console.log("[v0] API key found, making direct API call to Claude for question generation")

    const body = await request.json()
    const { difficulty, category, topic, context, count = 1 } = body

    console.log("[v0] Making request to Claude API for question generation")

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
        system: `You are an expert technical interview question generator. Create realistic, well-structured programming interview questions that are DIRECTLY RELATED to the specific lesson topic.

Your response must be a valid JSON object with this exact structure:
{
  "questions": [
    {
      "title": "Question Title",
      "difficulty": "Beginner|Easy|Medium|Hard|Expert",
      "category": "category name",
      "description": "detailed problem description",
      "interviewQuestion": "the actual question to ask the candidate",
      "hints": ["hint 1", "hint 2", "hint 3"],
      "expectedApproach": "description of expected solution approach",
      "timeEstimate": "estimated time to solve",
      "followUpQuestions": ["follow-up 1", "follow-up 2"],
      "testCases": [
        {"input": "example input", "expectedOutput": "expected result"}
      ]
    }
  ]
}

CRITICAL: Generate questions that are:
- DIRECTLY focused on practicing the specific lesson topic (not general programming)
- Appropriate for the specified difficulty level
- Require using the exact concepts taught in the lesson
- Clear and unambiguous
- Include practical test cases that demonstrate the lesson concept`,
        messages: [
          {
            role: "user",
            content: `Generate ${count} technical interview question(s) that SPECIFICALLY practice the lesson topic:

**Lesson Topic**: ${topic}
**Lesson Context**: ${context || "No additional context provided"}
**Difficulty**: ${difficulty}
**Category**: ${category}

IMPORTANT: The question MUST be directly related to "${topic}" and should require the student to practice the specific concepts from this lesson. Do not create generic programming questions - focus specifically on the lesson topic.

For example:
- If the topic is "Print Statements", create questions that require using print() functions
- If the topic is "Variables", create questions about declaring and using variables
- If the topic is "Loops", create questions that require writing loops

The question should help students practice what they just learned in the "${topic}" lesson.`,
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
    console.log("[v0] Received response from Claude API for question generation")

    let questionData
    try {
      const cleanedResponse = aiResponse
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters
        .replace(/\n/g, "\\n") // Escape newlines
        .replace(/\r/g, "\\r") // Escape carriage returns
        .replace(/\t/g, "\\t") // Escape tabs
        .trim()

      questionData = JSON.parse(cleanedResponse)
      console.log("[v0] Successfully parsed Claude question response")
    } catch (parseError) {
      console.error("[v0] Failed to parse Claude response:", parseError)
      console.error("[v0] Raw response:", aiResponse.substring(0, 1000)) // Log first 1000 chars for debugging

      // Fallback question if parsing fails
      questionData = {
        questions: [
          {
            title: `${difficulty} ${category} Problem`,
            difficulty,
            category,
            description: `A ${difficulty.toLowerCase()} level problem in ${category}`,
            interviewQuestion: `Write a function that solves a common ${category.toLowerCase()} problem.`,
            hints: ["Start with a simple approach", "Consider edge cases", "Think about time complexity"],
            expectedApproach: "Use standard algorithms and data structures",
            timeEstimate: "15-30 minutes",
            followUpQuestions: ["How would you optimize this solution?", "What are the time and space complexities?"],
            testCases: [{ input: "example input", expectedOutput: "expected result" }],
          },
        ],
      }
    }

    return NextResponse.json({
      questions: questionData.questions,
      metadata: {
        timestamp: new Date().toISOString(),
        difficulty,
        category,
        topic,
        context,
        model: "claude-3-5-haiku-20241022",
      },
    })
  } catch (error) {
    console.error("[v0] Error generating questions:", error)

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
        error: "Failed to generate questions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
