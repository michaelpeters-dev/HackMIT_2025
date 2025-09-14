"use client"

import { useState, useRef } from "react"
import { lessons } from "../data/lessons"
import { useLessonContext } from "./PracticeView"

export default function FooterControls() {
  const [isRunning, setIsRunning] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const { currentLessonId, setCurrentLessonId } = useLessonContext()

  const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId) || lessons[0]
  const canGoPrevious = currentLessonId > 1
  const canGoNext = currentLessonId < lessons.length

  const handlePreviousLesson = () => {
    if (canGoPrevious) {
      setCurrentLessonId(currentLessonId - 1)
    }
  }

  const handleNextLesson = () => {
    if (canGoNext) {
      setCurrentLessonId(currentLessonId + 1)
    }
  }

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        setRecordedAudio(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
        console.log("[v0] Recording completed, audio blob created")
      }

      mediaRecorder.start()
      setIsRecording(true)
      console.log("[v0] Recording started for thought process explanation")
    } catch (error) {
      console.error("Failed to start recording:", error)
      alert("Failed to access microphone. Please check your permissions.")
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log("[v0] Recording stopped")
    }
  }

  const handleSubmitWithExplanation = () => {
    if (recordedAudio) {
      // Here you would typically send the audio to an AI service for analysis
      console.log("[v0] Submitting solution with audio explanation")
      alert("Solution submitted with explanation! AI feedback will be provided shortly.")
      setRecordedAudio(null)
      setShowSubmitModal(false)
    }
  }

  const handleRunCode = async () => {
    setIsRunning(true)
    try {
      // Call the executeCode function from CodeEditor
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
    // This would trigger a hint in the AI Interviewer panel
    console.log("Hint requested")
  }

  const handleRevealAnswer = () => {
    if (confirm("Are you sure you want to reveal the answer? This will end your current attempt.")) {
      console.log("Answer revealed")
    }
  }

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session? Your progress will be saved.")) {
      console.log("Session ended")
    }
  }

  return (
    <>
      <div className="bg-white border-t border-gray-200 px-6 py-4 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePreviousLesson}
            disabled={!canGoPrevious}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 btn-press ${
              canGoPrevious
                ? "bg-gray-100 hover:bg-gray-200 text-gray-700 hover-lift"
                : "bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
          >
            ← Previous Lesson
          </button>

          <div className="text-center animate-fade-in">
            <div className="text-sm font-medium text-gray-900">Lesson {currentLessonId}</div>
            <div className="text-xs text-gray-500">{currentLesson.title}</div>
          </div>

          <button
            onClick={handleNextLesson}
            disabled={!canGoNext}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 btn-press ${
              canGoNext
                ? "bg-green-100 hover:bg-green-200 text-green-700 hover-lift"
                : "bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
          >
            Next Lesson →
          </button>
        </div>

        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 btn-press ${
              isRunning
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md hover-lift"
            }`}
          >
            {isRunning ? (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Running</span>
              </div>
            ) : (
              "Run Code"
            )}
          </button>

          <button
            onClick={handleGiveHint}
            className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-all duration-200 border border-gray-200 hover:border-gray-300 btn-press hover-lift"
          >
            Get Hint
          </button>

          <button
            onClick={handleRevealAnswer}
            className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-all duration-200 border border-gray-200 hover:border-gray-300 btn-press hover-lift"
          >
            Show Solution
          </button>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md btn-press hover-lift"
          >
            Submit & Explain
          </button>

          <div className="px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg font-medium text-sm border border-gray-200 font-mono animate-pulse">
            12:34
          </div>

          <button
            onClick={handleEndSession}
            className="px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium text-sm transition-all duration-200 border border-red-200 hover:border-red-300 btn-press hover-lift"
          >
            End Session
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-4 flex items-center space-x-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2 border border-gray-200 overflow-hidden">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: "35%" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          <span className="text-sm text-gray-500 font-mono whitespace-nowrap animate-fade-in">
            <span className="text-gray-900 font-semibold">2</span>/<span className="text-gray-500">6</span> tests passed
          </span>
        </div>
      </div>

      {/* Modal for recording thought process explanation */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Explain Your Thought Process</h3>
            <p className="text-gray-600 mb-6">
              Record yourself explaining how you approached this problem. The AI will analyze your explanation and
              provide feedback on your problem-solving process.
            </p>

            <div className="flex flex-col space-y-4">
              {!isRecording && !recordedAudio && (
                <button
                  onClick={handleStartRecording}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10V4C10 2.9 10.9 2 12 2ZM19 10V12C19 15.3 16.3 18 13 18V20H16V22H8V20H11V18C7.7 18 5 15.3 5 12V10H7V12C7 14.2 8.8 16 11 16H13C15.2 16 17 14.2 17 12V10H19Z" />
                  </svg>
                  <span>Start Recording</span>
                </button>
              )}

              {isRecording && (
                <button
                  onClick={handleStopRecording}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium animate-pulse"
                >
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                  <span>Stop Recording</span>
                </button>
              )}

              {recordedAudio && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-green-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span>Recording completed!</span>
                  </div>
                  <button
                    onClick={handleSubmitWithExplanation}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                  >
                    Submit Solution with Explanation
                  </button>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSubmitModal(false)
                    setRecordedAudio(null)
                    setIsRecording(false)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                {!recordedAudio && (
                  <button
                    onClick={() => {
                      // Submit without recording
                      console.log("[v0] Submitting solution without explanation")
                      alert("Solution submitted without explanation!")
                      setShowSubmitModal(false)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200"
                  >
                    Submit Without Recording
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
