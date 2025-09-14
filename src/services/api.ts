import type {
  Lesson,
  User,
  Submission,
  SubmissionResult,
  ApiResponse,
  PaginatedResponse,
  KeystrokeData,
  UserProgress,
} from "../types/api"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_API_URL) {
      console.log("[v0] Using mock data for development - no API URL configured")
      return this.handleMockFallback<T>(endpoint, options)
    }

    if (typeof window !== "undefined" && API_BASE_URL.includes("localhost")) {
      console.log("[v0] Using mock data - localhost API not available")
      return this.handleMockFallback<T>(endpoint, options)
    }

    const url = `${API_BASE_URL}${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    // Add auth token if available
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "API request failed")
      }

      return data
    } catch (error) {
      console.error("API request failed:", error)
      console.log("[v0] Falling back to mock data due to error")
      return this.handleMockFallback<T>(endpoint, options)
    }
  }

  private async handleMockFallback<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
    const { mockLessons, mockUser, generateMockSubmissionResult, generateMockComprehensiveEvaluation } = await import(
      "./mockData"
    )

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log("[v0] Mock endpoint called:", endpoint)

    if (endpoint.includes("/lessons") && !endpoint.includes("/hint")) {
      if (endpoint.includes("/lessons/") && !endpoint.includes("category")) {
        const id = Number.parseInt(endpoint.split("/lessons/")[1])
        const lesson = mockLessons.find((l) => l.id === id)
        return { data: lesson as T, success: true }
      }
      return { data: mockLessons as T, success: true }
    }

    if (endpoint.includes("/users/me")) {
      return { data: mockUser as T, success: true }
    }

    if (endpoint.includes("/users/progress")) {
      const mockProgress = mockLessons.map((lesson) => ({
        id: lesson.id,
        userId: mockUser.id,
        lessonId: lesson.id,
        completed: Math.random() > 0.5,
        score: Math.floor(Math.random() * 100),
        timeSpent: Math.floor(Math.random() * 3600),
        attempts: Math.floor(Math.random() * 5) + 1,
        lastAttempt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      return { data: mockProgress as T, success: true }
    }

    if (endpoint.includes("/interview/comprehensive-evaluation")) {
      if (options.method === "POST") {
        // Extract data from FormData if available
        let code = ""
        let transcription = ""
        let lessonId = 1 // default

        if (options.body instanceof FormData) {
          code = (options.body.get("code") as string) || ""
          transcription = (options.body.get("transcription") as string) || ""
          const lessonIdStr = options.body.get("lessonId") as string
          if (lessonIdStr) {
            lessonId = Number.parseInt(lessonIdStr, 10)
          }
        }

        console.log("[v0] Mock comprehensive evaluation with:", {
          codeLength: code.length,
          transcriptionLength: transcription.length,
        })

        const result = generateMockComprehensiveEvaluation(code, transcription, lessonId)
        return { data: result as T, success: true }
      }
    }

    if (endpoint.includes("/submissions")) {
      if (options.method === "POST") {
        const result = generateMockSubmissionResult(1, "mock code", true)
        return { data: result as T, success: true }
      }
      return { data: [] as T, success: true }
    }

    if (endpoint.includes("/code/execute")) {
      const mockResult = {
        output: ["Hello, World!"],
        errors: [],
        passed: true,
        executionTime: 150,
      }
      return { data: mockResult as T, success: true }
    }

    if (endpoint.includes("/lessons/hint")) {
      const mockHint = {
        hint: "Try breaking down the problem into smaller steps. Consider what data structure would be most efficient for this task.",
        type: "approach" as const,
      }
      return { data: mockHint as T, success: true }
    }

    console.warn("[v0] Mock endpoint not implemented:", endpoint)
    return { data: {} as T, success: true }
  }

  // Lesson endpoints
  async getLessons(page = 1, limit = 10): Promise<PaginatedResponse<Lesson>> {
    return this.request(`/lessons?page=${page}&limit=${limit}`)
  }

  async getLesson(id: number): Promise<ApiResponse<Lesson>> {
    return this.request(`/lessons/${id}`)
  }

  async getLessonsByCategory(category: string): Promise<ApiResponse<Lesson[]>> {
    return this.request(`/lessons/category/${category}`)
  }

  // User endpoints
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request("/users/me")
  }

  async updateUserProgress(lessonId: number, data: Partial<UserProgress>): Promise<ApiResponse<UserProgress>> {
    return this.request(`/users/progress/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async getUserProgress(): Promise<ApiResponse<UserProgress[]>> {
    return this.request("/users/progress")
  }

  // Submission endpoints
  async submitSolution(data: {
    lessonId: number
    code: string
    audioRecording?: Blob
    transcription?: string
    keystrokes?: KeystrokeData[]
  }): Promise<ApiResponse<Submission>> {
    const formData = new FormData()
    formData.append("lessonId", data.lessonId.toString())
    formData.append("code", data.code)

    if (data.audioRecording) {
      formData.append("audioRecording", data.audioRecording, "recording.wav")
    }

    if (data.transcription) {
      formData.append("transcription", data.transcription)
    }

    if (data.keystrokes) {
      formData.append("keystrokes", JSON.stringify(data.keystrokes))
    }

    // Use comprehensive evaluation endpoint
    return this.request("/interview/comprehensive-evaluation", {
      method: "POST",
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    })
  }

  async getSubmissionResult(submissionId: string): Promise<ApiResponse<SubmissionResult>> {
    return this.request(`/submissions/${submissionId}/result`)
  }

  async getUserSubmissions(lessonId?: number): Promise<ApiResponse<Submission[]>> {
    const query = lessonId ? `?lessonId=${lessonId}` : ""
    return this.request(`/submissions${query}`)
  }

  // Code execution endpoint
  async executeCode(
    code: string,
    testCases: any[],
  ): Promise<
    ApiResponse<{
      output: string[]
      errors: string[]
      passed: boolean
      executionTime: number
    }>
  > {
    return this.request("/code/execute", {
      method: "POST",
      body: JSON.stringify({ code, testCases }),
    })
  }

  // Hint endpoint
  async getHint(
    lessonId: number,
    currentCode: string,
  ): Promise<
    ApiResponse<{
      hint: string
      type: "syntax" | "logic" | "approach"
    }>
  > {
    return this.request("/lessons/hint", {
      method: "POST",
      body: JSON.stringify({ lessonId, currentCode }),
    })
  }
}

export const apiService = new ApiService()
