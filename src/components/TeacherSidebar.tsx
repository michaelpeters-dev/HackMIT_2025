"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { Pin, MessageCircle, BookOpen } from "lucide-react"
import { useLessonContext } from "./PracticeView"
import SummaryModal from "./SummaryModal"
import { useSubmission } from "../hooks/useApi"
import type { Lesson, KeystrokeData } from "../types/api"
import "../styles/code-contrast-fix.css"

interface Message {
  id: number
  text: string
  timestamp: string
  sender: "teacher" | "user"
  role?: "user" | "teacher"
}

interface LectureContent {
  title: string
  introduction: string
  concepts: string[]
  examples: Array<{
    title: string
    code: string
    explanation: string
  }>
  keyPoints: string[]
}

interface GeneratedQuestion {
  question: string
  difficulty: string
  topic: string
  hints: string[]
  followUpQuestions: string[]
}

interface TeacherSidebarProps {
  recordedAudio: Blob | null
  transcription: string
  keystrokes: KeystrokeData[]
  currentLesson: Lesson
  onGiveHint: () => void
  activeTab: "lecture" | "question" | "teacher"
  onTabChange: (tab: "lecture" | "question" | "teacher") => void
  shouldRequestHint: boolean
  onHintRequested: () => void
}

export default function TeacherSidebar({
  recordedAudio,
  transcription,
  keystrokes,
  currentLesson,
  onGiveHint,
  activeTab,
  onTabChange,
  shouldRequestHint,
  onHintRequested,
}: TeacherSidebarProps) {
  const { currentLessonId } = useLessonContext()
  const { submitSolution, submitting, result, error: submitError, clearResult } = useSubmission()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Welcome to your technical interview preparation session! I'm here to analyze your coding process and help you excel in programming interviews.\\n\\nI'll monitor your keystrokes, problem-solving approach, and provide real-time feedback to improve your interview performance. Let's start with the current question!",
      timestamp: "10:30 AM",
      sender: "teacher",
      role: "teacher",
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputMessage, setInputMessage] = useState("")
  const [lectureContent, setLectureContent] = useState<LectureContent | null>(null)
  const [isLoadingLecture, setIsLoadingLecture] = useState(false)
  const [generatedQuestion, setGeneratedQuestion] = useState<GeneratedQuestion | null>(null)
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [lastFeedbackType, setLastFeedbackType] = useState<number>(-1) // kept for future use
  const [feedbackCount, setFeedbackCount] = useState(0) // kept for future use
  const [lastFeedbackTime, setLastFeedbackTime] = useState<number>(0)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (text: string, sender: "teacher" | "user" = "teacher", role: "user" | "teacher" = "teacher") => {
    const newMessage: Message = {
      id: messages.length + 1,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender,
      role,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  // ---- Keystroke → API (Claude) analysis with local fallback ----
  const analyzeKeystrokes = async (recentKeystrokes: KeystrokeData[]) => {
    try {
      const response = await fetch("/api/teacher/keystroke-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          keystrokes: recentKeystrokes,
          context: {
            lessonTitle: currentLesson?.title || "Programming Practice",
            lessonDescription: currentLesson?.description || "Interactive programming assistance",
            analysisWindow: "45 seconds",
            totalKeystrokes: recentKeystrokes.length,
          },
          aiConfig: {
            model: "claude-3-5-haiku-20241022",
            maxTokens: 400,
            temperature: 0.3,
          },
        }),
      })

      const data = await response.json()
      if (data?.analysis && String(data.analysis).trim().length > 0) {
        return String(data.analysis)
      }
      return generateAdvancedLocalAnalysis(recentKeystrokes)
    } catch {
      return generateAdvancedLocalAnalysis(recentKeystrokes)
    }
  }

  useEffect(() => {
    if (!keystrokes || keystrokes.length === 0) return

    const feedbackInterval = setInterval(() => {
      const now = Date.now()
      const recentKeystrokes = keystrokes.filter((k) => now - k.timestamp <= 45000) // Last 45 seconds

      if (recentKeystrokes.length > 20) {
        // Prevent analysis if we just gave feedback recently
        const timeSinceLastFeedback = now - (lastFeedbackTime || 0)
        if (timeSinceLastFeedback < 20000) {
          // At least 20 seconds between feedback
          return
        }

        analyzeKeystrokes(recentKeystrokes)
          .then((analysis) => {
            if (analysis) {
              addMessage(analysis)
              setLastFeedbackTime(now) // Track when we last gave feedback
              // Auto-switch to teacher tab
              if (activeTab !== "teacher") {
                onTabChange("teacher")
              }
            }
          })
          .catch((error) => {
            console.error("Error during keystroke analysis:", error)
          })
      }
    }, 25000) // Every 25 seconds

    return () => clearInterval(feedbackInterval)
  }, [keystrokes, activeTab, lastFeedbackTime, onTabChange])

  // Local fallback analysis when Claude/API is not available
  const generateAdvancedLocalAnalysis = (keystrokes: KeystrokeData[]): string => {
    const typingKeys = keystrokes.filter((k) => k.key.length === 1)
    const backspaces = keystrokes.filter((k) => k.key === "Backspace")
    const specialKeys = keystrokes.filter((k) =>
      ["Tab", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k.key),
    )

    const timings = keystrokes
      .map((k, i) => (i > 0 ? k.timestamp - keystrokes[i - 1].timestamp : 0))
      .filter((t) => t > 0 && t < 10000) // Filter out extremely long pauses

    const avgTimeBetweenKeys = timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 0
    const longPauses = timings.filter((t) => t > 3000).length
    const rapidBursts = timings.filter((t) => t < 150).length

    const timeSpanSeconds =
      keystrokes.length > 1 ? (keystrokes[keystrokes.length - 1].timestamp - keystrokes[0].timestamp) / 1000 : 45
    const wpm = Math.round(typingKeys.length / 5 / (timeSpanSeconds / 60))

    const errorRate = typingKeys.length > 0 ? backspaces.length / typingKeys.length : 0
    const correctionEfficiency = backspaces.length > 0 ? typingKeys.length / backspaces.length : Number.POSITIVE_INFINITY

    const keyFrequency: { [key: string]: number } = {}
    typingKeys.forEach((k) => {
      keyFrequency[k.key.toLowerCase()] = (keyFrequency[k.key.toLowerCase()] || 0) + 1
    })

    const mostUsedKeys = Object.entries(keyFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, count]) => `${key}(${count})`)

    const hasConsistentRhythm = timings.length > 10 && Math.abs(Math.max(...timings) - Math.min(...timings)) < 800
    const showsHesitation = longPauses > keystrokes.length * 0.15
    const isTypingFast = avgTimeBetweenKeys < 180 && wpm > 30
    const showsGoodFlow = rapidBursts > keystrokes.length * 0.2 && longPauses < keystrokes.length * 0.1

    const feedbackOptions = [
      () => {
        if (wpm > 40) {
          return `**Performance Analysis:** Exceptional ${wpm} WPM with ${Math.round(errorRate * 100)}% error rate! You're moving quickly while keeping mistakes under control. Your ${longPauses} longer thinking pauses show strategic planning. **Next step:** narrate your intent before each short burst to make your reasoning legible.`
        } else if (wpm > 25) {
          return `**Performance Analysis:** Solid ${wpm} WPM and steady progress. ${backspaces.length} corrections across ${typingKeys.length} chars (${Math.round(
            correctionEfficiency,
          )}:1) shows healthy self-monitoring. **Next step:** commit a tiny slice (one function or case) and test it aloud.`
        } else {
          return `**Performance Analysis:** Deliberate pace at ${wpm} WPM with ${Math.round(errorRate * 100)}% error rate. Your ${longPauses} planning pauses suggest careful reasoning. **Next step:** code in 60–90s micro-iterations—implement one line, then validate it with a quick mental trace.`
        }
      },
      () => {
        if (showsGoodFlow) {
          return `**Flow:** Nice rhythm—${rapidBursts} quick bursts balanced by brief checks. That cadence usually reflects clarity. **Tip:** keep announcing the next micro-goal (“parse input”, “handle empty case”) before each burst.`
        } else if (hasConsistentRhythm) {
          return `**Flow:** Consistent timing (~${avgTimeBetweenKeys.toFixed(0)}ms between keys) indicates focus. **Tip:** punctuate with tiny test runs or mental walkthroughs to lock gains and surface edge cases early.`
        } else {
          return `**Flow:** Pace varies—${longPauses} longer pauses mixed with sprints. That's fine during design. **Tip:** when you pause, verbalize the decision you’re weighing (e.g., data shape, loop boundary) to keep interviewers aligned.`
        }
      },
      () => {
        if (specialKeys.length > keystrokes.length * 0.12) {
          return `**Editor proficiency:** Frequent special keys (${specialKeys.length}) suggest efficient navigation. **Tip:** keep leveraging quick cursor moves when refactoring small blocks—it's a subtle signal of fluency.`
        } else if (errorRate < 0.05) {
          return `**Accuracy:** Very low correction rate (~${Math.round(errorRate * 100)}%). **Tip:** don't be afraid to prototype imperfectly first—showing how you debug can be as impressive as pristine typing.`
        } else {
          return `**Editing:** Balanced speed with corrections (~${Math.round(errorRate * 100)}%); common keys: ${mostUsedKeys.join(
            ", ",
          )}. **Tip:** if you notice repeated typo patterns, slow for 10–15s to stabilize, then resume bursts.`
        }
      },
    ]

    const idx = Math.floor((Date.now() / 60000) % feedbackOptions.length)
    return feedbackOptions[idx]()
  }

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      addMessage(inputMessage, "user", "user")
      const currentInput = inputMessage
      setInputMessage("")

      setIsTyping(true)

      try {
        const response = await fetch("/api/teacher/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: currentInput,
            context: {
              userId: "user-123",
              sessionId: "session-" + Date.now(),
              messageHistory: messages.slice(-5),
              lessonTitle: currentLesson?.title || "Programming Practice",
              lessonDescription: currentLesson?.description || "Interactive programming assistance",
            },
            aiConfig: {
              model: "claude-3-5-haiku-20241022",
              maxTokens: 1000,
              temperature: 0.7,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to send message")
        }

        const data = await response.json()

        setIsTyping(false)
        addMessage(data.message || "I'm sorry, I couldn't process that request right now.")
      } catch (error) {
        console.error("[v0] Error sending message:", error)
        setIsTyping(false)

        if (error instanceof Error && error.message.includes("api_key")) {
          addMessage(
            "⚠️ **Configuration Required**: I need a Claude API key to respond. Please add your ANTHROPIC_API_KEY to the environment variables.",
            "teacher",
            "teacher",
          )
        } else if (error instanceof Error && error.message.includes("rate_limit")) {
          addMessage("⏱️ **Rate Limited**: Too many requests. Please wait a moment and try again.", "teacher", "teacher")
        } else {
          addMessage(
            "🔌 **Connection Error**: I'm having trouble connecting right now. Please try again later.",
            "teacher",
            "teacher",
          )
        }
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const generateLecture = async () => {
    if (!currentLesson) return

    setIsLoadingLecture(true)
    try {
      const response = await fetch("/api/teacher/lecture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: currentLessonId,
          lessonTitle: currentLesson.title,
          lessonDescription: currentLesson.description,
          context: "Generate comprehensive lecture material",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLectureContent(data.lectureContent)
      } else {
        const errorData = await response.json()
        if (response.status === 503) {
          addMessage(
            "🔄 **Service Temporarily Unavailable**: The Claude API is experiencing connectivity issues. This is usually temporary - please try again in a few moments.",
            "teacher",
            "teacher",
          )
        } else if (errorData.error?.includes("api_key") || errorData.error?.includes("ANTHROPIC_API_KEY")) {
          addMessage(
            "⚠️ **Configuration Required**: I need a Claude API key to generate lecture content. Please add your ANTHROPIC_API_KEY to the environment variables in your Vercel project settings.",
            "teacher",
            "teacher",
          )
        } else {
          addMessage(`❌ **Error**: ${errorData.error || "Failed to generate lecture content"}. Please try again.`, "teacher", "teacher")
        }
        setLectureContent(null)
      }
    } catch (error) {
      addMessage(
        "🔌 **Connection Error**: Unable to connect to the lecture generation service. Please check your internet connection and try again.",
        "teacher",
        "teacher",
      )
      setLectureContent(null)
    } finally {
      setIsLoadingLecture(false)
    }
  }

  const generateQuestion = async () => {
    if (!currentLesson) return

    setIsLoadingQuestion(true)
    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: currentLesson.title,
          difficulty: currentLesson.difficulty,
          category: currentLesson.category,
          context: currentLesson.description,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.questions && data.questions.length > 0) {
          const question = data.questions[0]
          setGeneratedQuestion({
            question: question.interviewQuestion,
            difficulty: question.difficulty,
            topic: question.category,
            hints: question.hints || [],
            followUpQuestions: question.followUpQuestions || [],
          })
        } else {
          setGeneratedQuestion(null)
        }
      } else {
        const errorData = await response.json()
        if (errorData.error?.includes("api_key") || errorData.error?.includes("ANTHROPIC_API_KEY")) {
          addMessage(
            "⚠️ **Configuration Required**: I need a Claude API key to generate questions. Please add your ANTHROPIC_API_KEY to the environment variables in your Vercel project settings.",
            "teacher",
            "teacher",
          )
        } else {
          addMessage(`❌ **Error**: ${errorData.error || "Failed to generate question content"}. Please try again.`, "teacher", "teacher")
        }
        setGeneratedQuestion(null)
      }
    } catch (error) {
      addMessage(
        "🔌 **Connection Error**: Unable to connect to the question generation service. Please check your internet connection and try again.",
        "teacher",
        "teacher",
      )
      setGeneratedQuestion(null)
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  useEffect(() => {
    if (activeTab === "lecture" && !lectureContent && !isLoadingLecture) {
      generateLecture()
    }
    if (activeTab === "question" && !generatedQuestion && !isLoadingQuestion) {
      generateQuestion()
    }
  }, [activeTab, currentLessonId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLectureContent(null)
    setGeneratedQuestion(null)
  }, [currentLessonId])

  const handleSubmit = async () => {
    if (!currentLesson) return

    try {
      const currentCode = (window as any).getCurrentCode?.() || ""

      await submitSolution({
        lessonId: currentLessonId,
        lessonTitle: currentLesson.title,
        lessonDifficulty: currentLesson.difficulty,
        lessonCategory: currentLesson.category,
        code: currentCode,
        audioRecording: recordedAudio || undefined,
        transcription: transcription || undefined,
        keystrokes: keystrokes || undefined,
      })
    } catch (error) {
      console.error("Submission failed:", error)
      addMessage("Failed to submit solution. Please try again.", "teacher", "teacher")
    }
  }

  useEffect(() => {
    if (result) {
      setShowSummaryModal(true)
    }
  }, [result])

  useEffect(() => {
    if (shouldRequestHint && activeTab === "teacher" && onHintRequested) {
      const currentCode = (window as any).getCurrentCode?.() || ""
      const hintMessage = `I need a hint for the current problem. Here's my current code:\n\n\`\`\`python\n${currentCode}\n\`\`\`\n\nCan you give me a small hint to help me move forward without giving away the complete solution?`
      addMessage(hintMessage, "user", "user")
      handleHintRequest(hintMessage)
      onHintRequested()
    }
  }, [shouldRequestHint, activeTab, onHintRequested])

  const handleHintRequest = async (message: string) => {
    setIsTyping(true)

    try {
      const response = await fetch("/api/teacher/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            userId: "user-123",
            sessionId: "session-" + Date.now(),
            messageHistory: messages.slice(-5),
            lessonTitle: currentLesson?.title || "Programming Practice",
            lessonDescription: currentLesson?.description || "Interactive programming assistance",
            isHintRequest: true,
          },
          aiConfig: {
            model: "claude-3-5-haiku-20241022",
            maxTokens: 1000,
            temperature: 0.7,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to send message")
      }

      const data = await response.json()

      setIsTyping(false)
      addMessage(data.message || "I'm sorry, I couldn't process that request right now.")
    } catch (error) {
      console.error("[v0] Error sending hint request:", error)
      setIsTyping(false)

      if (error instanceof Error && error.message.includes("api_key")) {
        addMessage(
          "⚠️ **Configuration Required**: I need a Claude API key to respond. Please add your ANTHROPIC_API_KEY to the environment variables.",
          "teacher",
          "teacher",
        )
      } else if (error instanceof Error && error.message.includes("rate_limit")) {
        addMessage("⏱️ **Rate Limited**: Too many requests. Please wait a moment and try again.", "teacher", "teacher")
      } else {
        addMessage("🔌 **Connection Error**: I'm having trouble connecting right now. Please try again later.", "teacher", "teacher")
      }
    }
  }

  if (!currentLesson) {
    return (
      <div className="w-[35%] bg-white/95 backdrop-blur-xl border-r border-gray-200/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx>{`
        .message-content code {
          background-color: #ffffff !important;
          color: #000000 !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          border: 2px solid #d1d5db !important;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace !important;
          font-size: 0.875rem !important;
          font-weight: 600 !important;
        }
        .message-content pre {
          background-color: #ffffff !important;
          color: #000000 !important;
          padding: 16px !important;
          border-radius: 8px !important;
          border: 2px solid #d1d5db !important;
          overflow-x: auto !important;
          margin: 12px 0 !important;
        }
        .message-content pre code {
          background-color: transparent !important;
          border: none !important;
          padding: 0 !important;
          color: #000000 !important;
        }
      `}</style>
      <div className="w-[35%] bg-white/95 backdrop-blur-xl border-r border-gray-200/50 flex flex-col shadow-xl shadow-gray-100/50 h-full">
        <div className="flex border-b border-gray-200/50 bg-white/90 backdrop-blur-sm">
          <button
            onClick={() => onTabChange("lecture")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
              activeTab === "lecture"
                ? "text-green-600 bg-gradient-to-r from-green-50/80 to-green-100/80"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
          >
            {activeTab === "lecture" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-green-600 animate-pulse"></div>
            )}
            <BookOpen
              className={`w-4 h-4 transition-all duration-300 ${activeTab === "lecture" ? "text-green-600 scale-110" : "text-gray-500 group-hover:scale-105"}`}
            />
            Lecture
          </button>

          <button
            onClick={() => onTabChange("question")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
              activeTab === "question"
                ? "text-green-600 bg-gradient-to-r from-green-50/80 to-green-100/80"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
          >
            {activeTab === "question" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-green-600 animate-pulse"></div>
            )}
            <Pin
              className={`w-4 h-4 transition-all duration-300 ${activeTab === "question" ? "text-green-600 scale-110" : "text-gray-500 group-hover:scale-105"}`}
            />
            Question
          </button>

          <button
            onClick={() => onTabChange("teacher")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
              activeTab === "teacher"
                ? "text-green-600 bg-gradient-to-r from-green-50/80 to-green-100/80"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
          >
            {activeTab === "teacher" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-green-600 animate-pulse"></div>
            )}
            <MessageCircle
              className={`w-4 h-4 transition-all duration-300 ${activeTab === "teacher" ? "text-green-600 scale-110" : "text-gray-500 group-hover:scale-105"}`}
            />
            Teacher
          </button>
        </div>

        {activeTab === "question" ? (
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50/50 to-white/80 backdrop-blur-sm">
            {isLoadingQuestion ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-600">Generating interview question...</p>
                </div>
              </div>
            ) : generatedQuestion ? (
              <div className="space-y-4">
                <div className="bg-white/90 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-xl shadow-green-100/20 border-l-4 border-l-green-500">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4">
                    <div className="text-sm text-gray-800 leading-relaxed font-medium">
                      {generatedQuestion.question}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Helpful Hints:</h4>
                      <ul className="space-y-1 text-sm text-blue-700">
                        {generatedQuestion.hints.map((hint, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>{hint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-800 mb-2">Interview Strategy:</h4>
                      <div className="text-sm text-green-700 leading-relaxed">
                        <p className="font-medium mb-2">
                          Your digital coding teacher will analyze your keystrokes in the IDE and give you advice and tips!
                        </p>
                        <ul className="space-y-1">
                          <li>• Clarify requirements - Ask questions about input/output format and constraints</li>
                          <li>• Think out loud - Verbalize your problem-solving process</li>
                          <li>• Start simple - Implement a working solution first, then optimize</li>
                          <li>• Test thoroughly - Walk through examples and edge cases</li>
                          <li>• Discuss complexity - Analyze time and space complexity</li>
                        </ul>
                      </div>
                    </div>

                    {generatedQuestion.followUpQuestions.length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-purple-800 mb-2">Follow-up Questions:</h4>
                        <ul className="space-y-1 text-sm text-purple-700">
                          {generatedQuestion.followUpQuestions.map((followUp, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span>{followUp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={generateQuestion}
                        className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-lg transition-all duration-300 font-medium shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                      >
                        Generate New Question
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <Pin className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">Click to generate an AI interview question</p>
                  <button
                    onClick={generateQuestion}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm rounded-xl transition-all duration-300 font-semibold shadow-lg transform hover:scale-105 active:scale-95 backdrop-blur-sm"
                  >
                    Generate Question
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "lecture" ? (
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50/50 to-white/80 backdrop-blur-sm">
            {isLoadingLecture ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-600">Generating lecture content...</p>
                </div>
              </div>
            ) : lectureContent ? (
              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-xl shadow-green-100/50 border-l-4 border-l-green-500">
                  <h2 className="text-sm font-bold text-gray-800 mb-4">{lectureContent.title}</h2>
                  <p className="text-sm text-gray-700 leading-relaxed">{lectureContent.introduction}</p>
                </div>

                <div className="bg-white/90 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-xl shadow-green-100/50">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Key Concepts</h3>
                  <ul className="space-y-2">
                    {lectureContent.concepts.map((concept, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{concept}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/90 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-xl shadow-green-100/50">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">Code Examples</h3>
                    <div className="space-y-4">
                      {lectureContent.examples.map((example, index) => (
                        <div key={index} className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-800">{example.title}</h4>
                          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto border border-gray-200">
                            <pre className="text-gray-800 text-sm font-mono leading-relaxed">
                              <code>{example.code}</code>
                            </pre>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{example.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-xl shadow-green-100/50">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Important Points</h3>
                  <ul className="space-y-2">
                    {lectureContent.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                        <span className="text-sm text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-6 shadow-xl shadow-green-100/50">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Practice Tips</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                      Try modifying the examples above with your own values
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                      Experiment with different inputs and see what happens
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                      Practice writing your own variations of the code
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></span>
                      Don't hesitate to ask questions if something is unclear
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">Click to generate lecture content</p>
                  <button
                    onClick={generateLecture}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-600/40 transform hover:scale-105 active:scale-95"
                  >
                    Generate Lecture
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-gray-50/50 to-white/80 backdrop-blur-sm">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className="space-y-2 animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} space-x-3 bg-white/90 backdrop-blur-sm border border-green-200/50 p-4 rounded-2xl shadow-lg shadow-green-100/30 border-l-4 border-l-green-500`}
                >
                  <div
                    className="prose prose-sm max-w-none message-content"
                    dangerouslySetInnerHTML={{
                      __html: message.text
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
                        .replace(/```python\n([\s\S]*?)\n```/g, "<pre><code>$1</code></pre>")
                        .replace(/`([^`]+)`/g, "<code>$1</code>")
                        .replace(
                          /^• (.+)$/gm,
                          '<div class="flex items-start gap-2 my-1"><span class="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span><span class="text-gray-700">$1</span></div>',
                        )
                        .replace(
                          /^(\\d+)\\. (.+)$/gm,
                          '<div class="flex items-start gap-3 my-1"><span class="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">$1</span><span class="text-gray-700">$2</span></div>',
                        )
                        .replace(/\\n\\n/g, '<div class="my-3"></div>')
                        .replace(/\\n/g, "<br>"),
                    }}
                  />
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm border border-green-200/50 p-4 rounded-2xl shadow-lg shadow-green-100/30 border-l-4 border-l-green-500">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce shadow-sm"></div>
                    <div
                      className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce shadow-sm"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce shadow-sm"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500">Typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="p-6 border-t border-gray-200/50 bg-white/95 backdrop-blur-xl">
          <div className="space-y-3">
            {activeTab === "teacher" && (
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask the teacher a question..."
                  className="flex-1 px-4 py-3 text-sm border border-gray-200/50 rounded-xl bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 shadow-lg shadow-gray-100/50 transition-all duration-300 hover:shadow-gray-200/50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
                    inputMessage.trim()
                      ? "bg-green-100/80 hover:bg-green-200/90 text-green-700 shadow-lg shadow-green-200/50 hover:shadow-xl hover:shadow-green-300/50 transform hover:scale-105 active:scale-95"
                      : "bg-gray-50/50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Send
                </button>
              </div>
            )}

            {onGiveHint && (
              <button
                onClick={onGiveHint}
                className="w-full px-6 py-3 bg-white/90 hover:bg-green-50/90 text-green-700 border border-green-200/50 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 backdrop-blur-sm"
              >
                Get Hint
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full px-6 py-3.5 text-white text-sm rounded-xl transition-all duration-300 font-semibold shadow-lg transform hover:scale-105 active:scale-95 hover:-translate-y-0.5 ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-600/40"
              }`}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </div>
              ) : (
                "Submit"
              )}
            </button>

            {submitError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{submitError}</div>
            )}
          </div>
        </div>
      </div>

      <SummaryModal
        isOpen={showSummaryModal}
        onClose={() => {
          setShowSummaryModal(false)
          clearResult()
        }}
        recordedAudio={recordedAudio}
        lessonTitle={currentLesson.title}
        lessonDifficulty={currentLesson.difficulty}
        lessonCategory={currentLesson.category}
        submissionResult={result}
      />
    </>
  )
}
