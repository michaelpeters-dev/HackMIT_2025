"use client"

import { useState, createContext, useContext, useRef, useEffect } from "react"
import TeacherSidebar from "./TeacherSidebar"
import IDEPanel from "./IDEPanel"
import { useLessons } from "../hooks/useApi"
import { useKeystrokes } from "../hooks/useKeystrokes"

interface LessonContextType {
  currentLessonId: number
  setCurrentLessonId: (id: number) => void
}

const LessonContext = createContext<LessonContextType | undefined>(undefined)

export const useLessonContext = () => {
  const context = useContext(LessonContext)
  if (!context) {
    throw new Error("useLessonContext must be used within a LessonProvider")
  }
  return context
}

export default function PracticeView() {
  const [currentLessonId, setCurrentLessonId] = useState(1)
  const [isRunning, setIsRunning] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState<string>("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const [teacherActiveTab, setTeacherActiveTab] = useState<"lecture" | "question" | "teacher">("lecture")
  const [shouldRequestHint, setShouldRequestHint] = useState(false)

  const { lessons, loading, error } = useLessons()
  const { keystrokes, startTracking, stopTracking, isTracking } = useKeystrokes()

  useEffect(() => {
    startTracking()
    return () => stopTracking()
  }, [startTracking, stopTracking])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lessons...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading lessons: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId) || lessons[0]
  const canGoPrevious = currentLessonId > 1
  const canGoNext = currentLessonId < lessons.length

  const handlePreviousLesson = () => {
    if (canGoPrevious) {
      setCurrentLessonId(currentLessonId - 1)
      stopTracking()
      startTracking()
    }
  }

  const handleNextLesson = () => {
    if (canGoNext) {
      setCurrentLessonId(currentLessonId + 1)
      stopTracking()
      startTracking()
    }
  }

  const handleRunCode = async () => {
    setIsRunning(true)
    try {
      if ((window as any).executeCode) {
        await (window as any).executeCode()
      }
    } catch (error) {
      console.error("Code execution failed:", error)
    } finally {
      setIsRunning(false)
    }
  }

  const handleGiveHint = () => {
    console.log("Hint requested - switching to teacher tab")
    setTeacherActiveTab("teacher")
    setShouldRequestHint(true)
  }

  const handleRecording = async () => {
    if (!isRecording && countdown === 0) {
      console.log("[v0] Starting countdown")
      setCountdown(3)

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            startRecording()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
        setIsRecording(false)
        console.log("[v0] Recording stopped")
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognitionRef.current = recognition

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onstart = () => {
          setIsTranscribing(true)
          console.log("[v0] Speech recognition started")
        }

        recognition.onresult = (event: any) => {
          let finalTranscript = ""
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " "
            }
          }
          if (finalTranscript) {
            setTranscription((prev) => prev + finalTranscript)
            console.log("[v0] Transcription updated:", finalTranscript)
          }
        }

        recognition.onerror = (event: any) => {
          console.error("[v0] Speech recognition error:", event.error)
        }

        recognition.onend = () => {
          setIsTranscribing(false)
          console.log("[v0] Speech recognition ended")
        }

        recognition.start()
      } else {
        console.log("[v0] Speech recognition not supported in this browser")
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        setRecordedAudio(audioBlob)
        stream.getTracks().forEach((track) => track.stop())

        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      console.log("[v0] Recording started")
    } catch (error) {
      console.error("Failed to start recording:", error)
      alert("Failed to access microphone. Please check your permissions.")
    }
  }

  const handleReplay = () => {
    if (recordedAudio && !isPlaying) {
      const audioUrl = URL.createObjectURL(recordedAudio)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.play()
      setIsPlaying(true)
      console.log("[v0] Playing recorded audio")
    } else if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      console.log("[v0] Stopped audio playback")
    }
  }

  return (
    <LessonContext.Provider value={{ currentLessonId, setCurrentLessonId }}>
      <nav className="bg-white/95 backdrop-blur-xl h-16 px-6 flex items-center justify-center border-b border-gray-200/50 shadow-lg shadow-gray-100/50 sticky top-0 z-50">
        <div className="flex items-center">
          <div className="flex items-center space-x-4 absolute left-6">
            <div className="bg-green-500 p-2 rounded-lg">
              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path
                  d="M16 2C12.5 2 9.5 4.2 8.5 7.3C7.8 7.1 7.1 7 6.4 7C4.5 7 2.8 8.1 2 9.8C1.2 11.5 1.5 13.5 2.8 14.8C2.3 15.8 2 16.9 2 18C2 21.3 4.7 24 8 24C8.7 24 9.4 23.9 10 23.6C11 26.7 14 29 17.5 29C21 29 24 26.7 25 23.6C25.6 23.9 26.3 24 27 24C29.2 24 31 22.2 31 20C31 18.9 30.6 17.9 29.9 17.1C30.5 16.1 30.8 15 30.8 13.8C30.8 10.5 28.1 7.8 24.8 7.8C24.1 7.8 23.4 7.9 22.8 8.2C21.8 4.8 19 2 16 2Z"
                  fill="white"
                  fillOpacity="0.2"
                />
                <path
                  d="M16 4C13.2 4 10.8 5.8 10 8.5M8.5 9C7.1 9 5.8 9.7 5.2 10.8C4.6 11.9 4.8 13.2 5.6 14M5 16C5 18.2 6.8 20 9 20M12 22C12.8 24.2 15 25.5 17.5 25.5C20 25.5 22.2 24.2 23 22M26 20C27.1 20 28 19.1 28 18C28 16.9 27.1 16 26 16M27.5 14C27.5 11.5 25.5 9.5 23 9.5M20 7C18.3 5.2 15.7 4.5 13.5 5.5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="14" r="1.5" fill="white" />
                <circle cx="20" cy="14" r="1.5" fill="white" />
                <circle cx="16" cy="18" r="1" fill="white" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Code<span className="text-green-600">Mind</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousLesson}
            disabled={!canGoPrevious}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
              canGoPrevious
                ? "bg-gray-100/80 hover:bg-gray-200/90 text-gray-700 shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-gray-300/50 transform hover:-translate-y-1 hover:scale-105 active:scale-95"
                : "bg-gray-50/50 text-gray-400 cursor-not-allowed"
            }`}
          >
            ← Previous
          </button>

          <div className="px-5 py-2.5 text-sm font-semibold text-green-700 bg-gradient-to-r from-green-50 to-green-100 rounded-xl shadow-lg shadow-green-200/50 border border-green-200/50 backdrop-blur-sm hover:shadow-green-300/50 transition-all duration-300 hover:scale-105">
            Lesson {currentLessonId}
          </div>

          <button
            onClick={handleNextLesson}
            disabled={!canGoNext}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
              canGoNext
                ? "bg-gray-100/80 hover:bg-gray-200/90 text-gray-700 shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-gray-300/50 transform hover:-translate-y-1 hover:scale-105 active:scale-95"
                : "bg-gray-50/50 text-gray-400 cursor-not-allowed"
            }`}
          >
            Next →
          </button>
        </div>

        <div className="flex items-center gap-2 absolute right-6">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 backdrop-blur-sm ${
              isRunning
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-600/40 transform hover:-translate-y-1 hover:scale-105 active:scale-95"
            }`}
          >
            {isRunning ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
                Running...
              </div>
            ) : (
              "Run"
            )}
          </button>

          <button
            onClick={handleRecording}
            disabled={countdown > 0}
            className={`px-3 py-2.5 rounded-xl transition-all duration-300 backdrop-blur-sm flex items-center justify-center ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-600/40"
                : countdown > 0
                  ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/30"
                  : "bg-red-300 hover:bg-red-400 text-white shadow-lg shadow-red-300/30 hover:shadow-xl hover:shadow-red-400/40"
            } transform hover:-translate-y-1 hover:scale-105 active:scale-95`}
          >
            {countdown > 0 ? (
              <span className="text-lg font-bold">{countdown}</span>
            ) : isRecording ? (
              <div className="w-4 h-4 bg-white rounded-sm animate-pulse"></div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10V4C10 2.9 10.9 2 12 2ZM19 10V12C19 15.3 16.3 18 13 18V20H16V22H8V20H11V18C7.7 18 5 15.3 5 12V10H7V12C7 14.2 8.8 16 11 16H13C15.2 16 17 14.2 17 12V10H19Z" />
              </svg>
            )}
          </button>

          {recordedAudio && (
            <button
              onClick={handleReplay}
              className={`px-3 py-2.5 rounded-xl transition-all duration-300 backdrop-blur-sm flex items-center justify-center ${
                isPlaying
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
                  : "bg-blue-400 hover:bg-blue-500 text-white shadow-lg shadow-blue-400/30"
              } transform hover:-translate-y-1 hover:scale-105 active:scale-95`}
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </nav>

      <div className="flex h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50/50 to-white">
        <TeacherSidebar
          recordedAudio={recordedAudio}
          transcription={transcription}
          keystrokes={keystrokes}
          currentLesson={currentLesson}
          onGiveHint={handleGiveHint}
          activeTab={teacherActiveTab}
          onTabChange={setTeacherActiveTab}
          shouldRequestHint={shouldRequestHint}
          onHintRequested={() => setShouldRequestHint(false)}
        />
        <IDEPanel />
      </div>
    </LessonContext.Provider>
  )
}
