import { type NextRequest, NextResponse } from "next/server"

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

    // Parse keystrokes if provided
    let keystrokeData = []
    if (keystrokes) {
      try {
        keystrokeData = JSON.parse(keystrokes)
      } catch (error) {
        console.error("[v0] Failed to parse keystrokes:", error)
      }
    }

    // Check if we have the required API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("[v0] No ANTHROPIC_API_KEY found, using mock evaluation")
      return NextResponse.json({
        data: generateMockEvaluation(code, transcription),
        success: true,
      })
    }

    // Make Claude API call for comprehensive evaluation
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: `You are an expert technical interviewer evaluating a candidate's performance. Analyze both their code solution and verbal explanation.

CODE SOLUTION:
${code || "No code provided"}

VERBAL EXPLANATION (transcribed):
${transcription || "No verbal explanation provided"}

KEYSTROKE DATA:
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
- Code correctness and logic
- Code quality, efficiency, and readability
- Verbal explanation clarity and technical accuracy
- Overall interview performance and confidence
- Look for filler words (um, uh, like) and hesitation in transcription
- Assess problem-solving approach and communication skills

Provide constructive feedback that helps the candidate improve their interview skills.`,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error("[v0] Claude API error:", claudeResponse.status, errorText)

      return NextResponse.json({
        data: generateMockEvaluation(code, transcription),
        success: true,
      })
    }

    const claudeData = await claudeResponse.json()
    console.log("[v0] Claude response received:", claudeData)

    let evaluationResult
    try {
      const responseText = claudeData.content[0].text
      console.log("[v0] Raw Claude response:", responseText)

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
      console.log("[v0] Parsed evaluation result:", evaluationResult)
    } catch (parseError) {
      console.error("[v0] Failed to parse Claude response:", parseError)
      console.log("[v0] Raw response text:", claudeData.content[0].text)

      // Fallback to mock evaluation
      evaluationResult = generateMockEvaluation(code, transcription)
    }

    return NextResponse.json({
      data: evaluationResult,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Comprehensive evaluation error:", error)

    // Return mock evaluation as fallback
    const mockResult = generateMockEvaluation("", "")
    return NextResponse.json({
      data: mockResult,
      success: true,
    })
  }
}

function generateMockEvaluation(code: string, transcription: string) {
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

  let feedback = "Mock evaluation: "
  if (hasCode && hasTranscription) {
    feedback += `Great job providing both a code solution and verbal explanation! Your confidence score of ${confidenceScore}% reflects good technical communication. `
    if (fillerWordCount > 3) {
      feedback += `Try to reduce filler words (detected ${fillerWordCount}) to sound more confident. `
    }
    if (confidenceIndicators > 0) {
      feedback += "Your use of confident language shows good technical understanding. "
    }
    feedback += "Continue practicing to improve your interview performance."
  } else if (hasCode) {
    feedback += `You provided a code solution (${confidenceScore}% confidence), but adding verbal explanation would significantly improve your interview performance. Practice explaining your thought process out loud.`
  } else if (hasTranscription) {
    feedback += `Good verbal communication detected, but no code solution was provided. Make sure to implement your ideas in code during technical interviews.`
  } else {
    feedback +=
      "No code or verbal explanation detected. In technical interviews, provide both a working solution and clear explanation of your approach."
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
