import type { Lesson, User, SubmissionResult } from "../types/api"

// Mock lessons data for development
export const mockLessons: Lesson[] = [
  {
    id: 1,
    title: "Print Statements",
    difficulty: "Beginner",
    category: "Python Basics",
    description: "Learn the basics of Python output",
    interviewQuestion: "Write a Python program that displays 'Hello, World!' to the console.",
    tasks: [
      "Write a Python program that prints 'Hello, World!' to the console",
      "Make sure the output matches exactly",
    ],
    expectedOutput: ["Hello, World!"],
    learningObjectives: [
      "Understand the print() function",
      "Learn basic Python syntax",
      "Execute your first Python program",
    ],
    hints: ["Use the print() function to output text", "Remember to put the text in quotes"],
    whyItMatters: {
      description: "The print() function is fundamental to Python programming and debugging.",
      points: [
        "Essential for displaying output to users",
        "Critical for debugging and testing code",
        "Foundation for more complex output operations",
      ],
    },
    problem: "Write a Python program that prints 'Hello, World!' to the console.",
    starterCode: "# Write your solution here\n",
    solution: "print('Hello, World!')",
    testCases: [
      {
        input: "",
        expectedOutput: "Hello, World!",
      },
    ],
  },
  {
    id: 2,
    title: "Interactive Programming: Variables and User Input",
    difficulty: "Beginner",
    category: "Python Basics",
    description: "Working with variables and user input",
    interviewQuestion: "Write a program that asks for the user's name and displays a personalized greeting.",
    tasks: [
      "Create a program that asks for the user's name",
      "Store the input in a variable",
      "Display a personalized greeting",
    ],
    expectedOutput: ["What's your name? Alice", "Hello, Alice! Nice to meet you."],
    learningObjectives: [
      "Learn to use the input() function",
      "Understand variable assignment",
      "Practice string formatting",
    ],
    hints: ["Use input() to get user input", "Use f-strings or string concatenation to combine text with variables"],
    whyItMatters: {
      description: "User interaction is essential for creating dynamic, responsive programs.",
      points: [
        "Foundation for interactive applications",
        "Essential for data collection",
        "Key skill for user experience design",
      ],
    },
    problem: "Create a program that asks for the user's name and greets them personally.",
    starterCode: "# Write your solution here\n",
    solution: 'name = input("What\'s your name? ")\nprint(f"Hello, {name}! Nice to meet you.")',
    testCases: [
      {
        input: "Alice",
        expectedOutput: "Hello, Alice! Nice to meet you.",
      },
    ],
  },
  {
    id: 3,
    title: "Function Design: Mathematical Operations",
    difficulty: "Easy",
    category: "Functions",
    description: "Perform calculations with Python",
    interviewQuestion:
      "Write a function that takes two numbers and returns their sum, difference, product, and quotient.",
    tasks: [
      "Write a function that takes two numbers as parameters",
      "Return the sum, difference, product, and quotient",
      "Test your function with sample values",
    ],
    expectedOutput: ["(15, 5, 50, 2.0)"],
    learningObjectives: [
      "Learn function definition syntax",
      "Understand return statements",
      "Practice basic arithmetic operations",
    ],
    hints: ["Return multiple values as a tuple", "Use +, -, *, / for basic operations"],
    whyItMatters: {
      description: "Functions are the building blocks of modular, reusable code.",
      points: ["Essential for code organization", "Enables code reusability", "Foundation for complex algorithms"],
    },
    problem: "Write a function that takes two numbers and returns their sum, difference, product, and quotient.",
    starterCode: "# Write your solution here\n",
    solution: "def calculate(a, b):\n    return a + b, a - b, a * b, a / b\n\nresult = calculate(10, 5)\nprint(result)",
    testCases: [
      {
        input: "calculate(10, 5)",
        expectedOutput: "(15, 5, 50, 2.0)",
      },
    ],
  },
]

// Mock user data
export const mockUser: User = {
  id: "user-123",
  name: "John Doe",
  email: "john@example.com",
  progress: [
    {
      lessonId: 1,
      completed: true,
      score: 85,
      attempts: 2,
      lastAttemptAt: "2024-01-15T10:30:00Z",
      timeSpent: 1200,
    },
    {
      lessonId: 2,
      completed: false,
      attempts: 1,
      lastAttemptAt: "2024-01-15T11:00:00Z",
      timeSpent: 600,
    },
  ],
  createdAt: "2024-01-10T09:00:00Z",
  updatedAt: "2024-01-15T11:00:00Z",
}

// Mock submission result generator
export function generateMockSubmissionResult(lessonId: number, code: string, hasAudio = false): SubmissionResult {
  const isCorrect = Math.random() > 0.3 // 70% chance of being correct
  const confidenceScore = Math.floor(Math.random() * 30) + (isCorrect ? 70 : 40)

  return {
    id: `result-${Date.now()}`,
    submissionId: `submission-${Date.now()}`,
    score: confidenceScore,
    confidenceScore,
    isCorrect,
    feedback: isCorrect
      ? "Great job! Your solution demonstrates solid understanding of the concepts. Your approach is clean and efficient."
      : "Good effort! Your solution has the right idea but needs some refinement. Consider reviewing the key concepts and try again.",
    codeAnalysis: {
      quality: Math.floor(Math.random() * 20) + 75,
      efficiency: Math.floor(Math.random() * 25) + 70,
      readability: Math.floor(Math.random() * 15) + 80,
    },
    audioAnalysis: hasAudio
      ? {
          clarity: Math.floor(Math.random() * 20) + 75,
          explanation: Math.floor(Math.random() * 25) + 70,
          confidence: Math.floor(Math.random() * 30) + 65,
          transcription: "I'm solving this step by step. First, I need to understand the problem requirements...",
        }
      : undefined,
    createdAt: new Date().toISOString(),
  }
}

export function generateMockComprehensiveEvaluation(code: string, transcription: string, lessonId?: number) {
  const hasCode = code && code.trim().length > 0
  const hasTranscription = transcription && transcription.trim().length > 0

  console.log("[v0] Generating mock evaluation:", { hasCode, hasTranscription, transcription })

  const lesson = mockLessons.find((l) => l.id === lessonId) || mockLessons[0]
  const expectedSolution = lesson.solution.toLowerCase().replace(/\s+/g, " ").trim()
  const userCode = code.toLowerCase().replace(/\s+/g, " ").trim()

  let isCodeCorrect = false
  if (hasCode) {
    // Check for key elements in the solution
    if (lesson.id === 1) {
      // Print Statements lesson
      isCodeCorrect =
        userCode.includes("print") && (userCode.includes("hello, world") || userCode.includes("hello world"))
    } else {
      // For other lessons, do a more general similarity check
      const codeWords = userCode.split(" ")
      const solutionWords = expectedSolution.split(" ")
      const matchingWords = codeWords.filter((word) => solutionWords.includes(word))
      isCodeCorrect = matchingWords.length >= solutionWords.length * 0.6
    }
  }

  // Analyze transcription for filler words and confidence
  let fillerWordCount = 0
  let confidenceIndicators = 0
  let explanationQuality = 0

  if (hasTranscription) {
    const fillerWords = ["um", "uh", "like", "you know", "basically", "actually", "testing", "nothing"]
    const confidenceWords = ["definitely", "clearly", "obviously", "certainly", "exactly", "sure", "confident"]
    const explanationWords = ["because", "first", "then", "next", "step", "approach", "method", "solution", "problem"]

    const lowerTranscription = transcription.toLowerCase()
    fillerWords.forEach((word) => {
      const matches = lowerTranscription.split(word).length - 1
      fillerWordCount += matches
    })

    confidenceWords.forEach((word) => {
      const matches = lowerTranscription.split(word).length - 1
      confidenceIndicators += matches
    })

    explanationWords.forEach((word) => {
      const matches = lowerTranscription.split(word).length - 1
      explanationQuality += matches
    })
  }

  let confidenceScore = 30 // Base minimum score

  if (isCodeCorrect) {
    confidenceScore += 40 // Major boost for correct code
  } else if (hasCode) {
    confidenceScore += 20 // Some credit for attempting code
  }

  if (hasTranscription) {
    confidenceScore += 15 // Base transcription bonus
    confidenceScore += Math.min(explanationQuality * 3, 15) // Bonus for good explanation
    confidenceScore += Math.min(confidenceIndicators * 2, 10) // Bonus for confident language
    confidenceScore -= Math.min(fillerWordCount * 2, 15) // Penalty for filler words
  }

  // Add some randomness but keep it realistic
  confidenceScore += Math.floor(Math.random() * 10) - 5
  confidenceScore = Math.max(25, Math.min(95, confidenceScore))

  const codeQuality = isCodeCorrect ? Math.floor(Math.random() * 15) + 80 : Math.floor(Math.random() * 20) + 50
  const codeEfficiency = isCodeCorrect ? Math.floor(Math.random() * 15) + 75 : Math.floor(Math.random() * 25) + 45
  const codeReadability = hasCode ? Math.floor(Math.random() * 15) + 75 : 40

  const audioClarity = hasTranscription ? Math.max(60, 90 - fillerWordCount * 2) : 0
  const audioExplanation = hasTranscription ? Math.max(50, 70 + explanationQuality * 2 - fillerWordCount) : 0
  const audioConfidence = hasTranscription ? Math.max(50, 85 - fillerWordCount * 3 + confidenceIndicators * 5) : 0

  let feedback = "Mock evaluation: "
  if (isCodeCorrect && hasTranscription && explanationQuality > 2) {
    feedback += `Excellent work! Your code is correct and you provided a clear explanation. Confidence score: ${confidenceScore}%. `
  } else if (isCodeCorrect && hasTranscription) {
    feedback += `Good job! Your code is correct. Your confidence score of ${confidenceScore}% could improve with better explanation of your approach. `
  } else if (isCodeCorrect) {
    feedback += `Your code solution is correct (${confidenceScore}% confidence), but adding verbal explanation would significantly improve your interview performance. `
  } else if (hasCode && hasTranscription) {
    feedback += `You provided both code and explanation, but the solution needs work. Confidence score: ${confidenceScore}%. Review the problem requirements. `
  } else if (hasCode) {
    feedback += `Code attempt detected but solution is incorrect. Confidence score: ${confidenceScore}%. Add verbal explanation and review the requirements. `
  } else if (hasTranscription) {
    feedback += `Good verbal communication detected, but no code solution was provided. Implement your ideas in code for technical interviews. `
  } else {
    feedback += `No code or verbal explanation detected. Provide both a working solution and clear explanation of your approach. `
  }

  if (fillerWordCount > 3) {
    feedback += `Try to reduce filler words (detected ${fillerWordCount}) to sound more confident. `
  }
  if (confidenceIndicators > 0) {
    feedback += "Your use of confident language shows good technical understanding. "
  }

  return {
    confidenceScore,
    isCorrect: isCodeCorrect,
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
