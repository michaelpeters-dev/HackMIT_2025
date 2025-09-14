export interface Lesson {
  id: number
  title: string
  difficulty: "Beginner" | "Easy" | "Medium" | "Hard" | "Expert"
  category: string
  description: string
  interviewQuestion: string
  tasks: string[]
  expectedOutput: string[]
  learningObjectives: string[]
  hints: string[]
  whyItMatters: {
    description: string
    points: string[]
  }
  problem: string
  starterCode: string
  solution: string
  testCases: Array<{
    input: string
    expectedOutput: string
  }>
}

export interface User {
  id: string
  name: string
  email: string
  progress: UserProgress[]
  createdAt: string
  updatedAt: string
}

export interface UserProgress {
  lessonId: number
  completed: boolean
  score?: number
  attempts: number
  lastAttemptAt: string
  timeSpent: number // in seconds
}

export interface Submission {
  id: string
  userId: string
  lessonId: number
  code: string
  audioRecording?: Blob
  keystrokes?: KeystrokeData[]
  submittedAt: string
  result?: SubmissionResult
}

export interface KeystrokeData {
  timestamp: number
  key: string
  action: "keydown" | "keyup"
  code: string
}

export interface SubmissionResult {
  id: string
  submissionId: string
  score: number
  confidenceScore: number
  isCorrect: boolean
  feedback: string
  codeAnalysis: {
    quality: number
    efficiency: number
    readability: number
  }
  audioAnalysis?: {
    clarity: number
    explanation: number
    confidence: number
    transcription: string
  }
  createdAt: string
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  success: boolean
  message?: string
}
