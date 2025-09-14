import { type NextRequest, NextResponse } from "next/server"
import { lessons } from "../../../../src/data/lessons"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const lessonId = formData.get("lessonId") as string
    const code = formData.get("code") as string
    const transcription = formData.get("transcription") as string
    const keystrokes = formData.get("keystrokes") as string

    console.log("[v0] Comprehensive evaluation request:", {
      lessonId,
      codeLength: code?.length || 0,
      transcriptionLength: transcription?.length || 0,
      keystrokesLength: keystrokes?.length || 0,
    })

    const lesson = lessons.find((l) => l.id === Number.parseInt(lessonId))
    const questionContext = lesson
      ? {
          title: lesson.title,
          difficulty: lesson.difficulty,
          category: lesson.category,
          description: lesson.description,
          problem: lesson.problem,
          expectedOutput: lesson.expectedOutput,
        }
      : null

    // Parse keystrokes if provided
    let keystrokeData = []
    if (keystrokes) {
      try {
        keystrokeData = JSON.parse(keystrokes)
      } catch (error) {
        console.error("[v0] Failed to parse keystrokes:", error)
      }
    }

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

    console.log("[v0] API key found, making direct API call to Claude for evaluation")

    const claudePrompt = `You are an expert coding instructor evaluating a student's solution to a programming exercise.

LESSON CONTEXT:
${
  questionContext
    ? `
Title: ${questionContext.title}
Difficulty: ${questionContext.difficulty}
Category: ${questionContext.category}
Description: ${questionContext.description}
Problem: ${questionContext.problem}
Expected Output: ${questionContext.expectedOutput.join(", ")}
`
    : "No lesson context available"
}

STUDENT'S CODE SOLUTION:
${code || "No code provided"}

STUDENT'S VERBAL EXPLANATION (transcribed):
${transcription || "No verbal explanation provided"}

ADDITIONAL DATA:
${keystrokeData.length > 0 ? `${keystrokeData.length} keystrokes recorded` : "No keystroke data"}

Please provide a comprehensive evaluation in JSON format with the following structure:
{
  "confidenceScore": <number 0-100>,
  "isCorrect": <boolean>,
  "feedback": "<detailed feedback string>",
  "codeAnalysis": {
    "quality": <number 0-100>,
    "efficiency": <number 0-100>,
    "readability": <number 0-100>
  },
  "audioAnalysis": {
    "clarity": <number 0-100>,
    "explanation": <number 0-100>,
    "confidence": <number 0-100>,
    "transcription": "${transcription || ""}"
  }
}

Evaluation criteria:
- Does the code correctly solve the specific problem described in the lesson?
- Code quality, efficiency, and readability appropriate for the difficulty level
- How well does the verbal explanation demonstrate understanding of the concept?
- Overall learning progress and confidence for this specific topic
- Consider the lesson difficulty when setting expectations
- Provide encouraging, educational feedback that helps the student learn

Focus on whether the student understood and correctly implemented the specific lesson concept (${questionContext?.title || "the programming concept"}).`

    console.log("[v0] Making request to Claude API for comprehensive evaluation")

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: claudePrompt,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error("[v0] Claude API error:", claudeResponse.status, errorText)

      if (claudeResponse.status === 401) {
        return NextResponse.json(
          {
            error: "Claude API key authentication failed. Please check your ANTHROPIC_API_KEY.",
            details: errorText,
          },
          { status: 500 },
        )
      }

      if (claudeResponse.status === 429) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again in a moment.",
            details: errorText,
          },
          { status: 429 },
        )
      }

      return NextResponse.json(
        {
          error: "Claude API request failed",
          details: `HTTP ${claudeResponse.status}: ${errorText}`,
        },
        { status: 500 },
      )
    }

    const claudeData = await claudeResponse.json()
    console.log("[v0] Claude response received successfully")

    let evaluationResult
    try {
      const responseText = claudeData.content[0].text
      console.log("[v0] Processing Claude response for evaluation")

      // Extract JSON from Claude's response (handle markdown formatting)
      let jsonText = responseText
      if (responseText.includes("```json")) {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          jsonText = jsonMatch[1]
        }
      } else if (responseText.includes("```")) {
        const jsonMatch = responseText.match(/```\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          jsonText = jsonMatch[1]
        }
      }

      evaluationResult = JSON.parse(jsonText)
      console.log("[v0] Successfully parsed Claude evaluation result")
    } catch (parseError) {
      console.error("[v0] Failed to parse Claude response:", parseError)
      console.log("[v0] Raw response text:", claudeData.content[0].text)

      return NextResponse.json(
        {
          error: "Failed to parse Claude evaluation response",
          details: "The AI response could not be processed. Please try again.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      data: evaluationResult,
      success: true,
      metadata: {
        timestamp: new Date().toISOString(),
        lessonId,
        model: "claude-3-5-haiku-20241022",
      },
    })
  } catch (error) {
    console.error("[v0] Comprehensive evaluation error:", error)

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
        error: "Failed to evaluate submission",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function generateMockEvaluation(code: string, transcription: string, questionContext: any) {
  const hasCode = code && code.trim().length > 0
  const hasTranscription = transcription && transcription.trim().length > 0

  // Analyze transcription for filler words and confidence
  let fillerWordCount = 0
  let confidenceIndicators = 0

  if (hasTranscription) {
    const fillerWords = ["um", "uh", "like", "you know", "basically", "actually"]
    const confidenceWords = ["definitely", "clearly", "obviously", "certainly", "exactly"]

    const lowerTranscription = transcription.toLowerCase()
    fillerWords.forEach((word) => {
      const matches = lowerTranscription.split(word).length - 1
      fillerWordCount += matches
    })

    confidenceWords.forEach((word) => {
      const matches = lowerTranscription.split(word).length - 1
      confidenceIndicators += matches
    })
  }

  // Calculate scores based on available data
  const baseConfidence = hasCode ? 75 : 45
  const transcriptionBonus = hasTranscription ? 15 : 0
  const fillerPenalty = Math.min(fillerWordCount * 3, 20)
  const confidenceBonus = Math.min(confidenceIndicators * 2, 10)

  const confidenceScore = Math.max(
    30,
    Math.min(
      95,
      baseConfidence + transcriptionBonus - fillerPenalty + confidenceBonus + Math.floor(Math.random() * 10),
    ),
  )

  const codeQuality = hasCode ? Math.floor(Math.random() * 20) + 70 : 50
  const codeEfficiency = hasCode ? Math.floor(Math.random() * 25) + 65 : 45
  const codeReadability = hasCode ? Math.floor(Math.random() * 15) + 75 : 55

  const audioClarity = hasTranscription ? Math.max(60, 90 - fillerWordCount * 2) : 0
  const audioExplanation = hasTranscription ? Math.floor(Math.random() * 20) + 70 : 0
  const audioConfidence = hasTranscription ? Math.max(50, 85 - fillerWordCount * 3 + confidenceIndicators * 5) : 0

  let feedback = ""
  if (questionContext) {
    feedback += `Evaluation for "${questionContext.title}" (${questionContext.difficulty}): `
  }

  if (hasCode && hasTranscription) {
    feedback += `Great job providing both a code solution and verbal explanation! Your confidence score of ${confidenceScore}% reflects good understanding of the concept. `
    if (fillerWordCount > 3) {
      feedback += `Try to reduce filler words (detected ${fillerWordCount}) to sound more confident. `
    }
    if (confidenceIndicators > 0) {
      feedback += "Your use of confident language shows good technical understanding. "
    }
    feedback += "Continue practicing to improve your coding skills."
  } else if (hasCode) {
    feedback += `You provided a code solution (${confidenceScore}% confidence), but adding verbal explanation would help demonstrate your understanding of the concept. Practice explaining your thought process.`
  } else if (hasTranscription) {
    feedback += `Good verbal communication detected, but no code solution was provided. Make sure to implement your ideas in code to practice the concept.`
  } else {
    feedback +=
      "No code or verbal explanation detected. Try implementing the solution and explaining your approach to better learn the concept."
  }

  return {
    confidenceScore,
    isCorrect: hasCode && confidenceScore > 60,
    feedback,
    codeAnalysis: {
      quality: codeQuality,
      efficiency: codeEfficiency,
      readability: codeReadability,
    },
    audioAnalysis: hasTranscription
      ? {
          clarity: audioClarity,
          explanation: audioExplanation,
          confidence: audioConfidence,
          transcription: transcription.substring(0, 200) + (transcription.length > 200 ? "..." : ""),
        }
      : null,
  }
}
