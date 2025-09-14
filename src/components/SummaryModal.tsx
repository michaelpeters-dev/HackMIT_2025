"use client"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import type { SubmissionResult } from "../types/api"

interface SummaryModalProps {
  isOpen: boolean
  onClose: () => void
  recordedAudio: Blob | null
  lessonTitle: string
  lessonDifficulty: string
  lessonCategory: string
  submissionResult?: SubmissionResult | null // Added API submission result prop
}

export default function SummaryModal({
  isOpen,
  onClose,
  recordedAudio,
  lessonTitle,
  lessonDifficulty,
  lessonCategory,
  submissionResult, // Added submission result from API
}: SummaryModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && !submissionResult) {
      setIsLoading(true)
    } else if (submissionResult) {
      setIsLoading(false)
    }
  }, [isOpen, submissionResult])

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 80) return "text-green-500"
    if (score >= 70) return "text-yellow-500"
    if (score >= 60) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-100"
    if (score >= 80) return "bg-green-50"
    if (score >= 70) return "bg-yellow-50"
    if (score >= 60) return "bg-orange-50"
    return "bg-red-50"
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-gray-200/50 max-w-md w-full max-h-[90vh] border border-gray-200/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Summary</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-300 hover:scale-105"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 text-sm">Analyzing your performance...</p>
              </div>
            </div>
          ) : submissionResult ? (
            <div className="space-y-6">
              <div className="text-center">
                <div
                  className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${getScoreBg(submissionResult.confidenceScore)} mb-4 shadow-lg`}
                >
                  <span className={`text-2xl font-bold ${getScoreColor(submissionResult.confidenceScore)}`}>
                    {submissionResult.confidenceScore}%
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Topic Confidence</h3>
              </div>

              <div className="text-center">
                <div
                  className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium ${
                    submissionResult.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {submissionResult.isCorrect ? "✓ Question Answered Correctly" : "✗ Question Needs Improvement"}
                </div>
              </div>

              <div
                className={`backdrop-blur-sm border rounded-2xl p-4 shadow-lg ${
                  submissionResult.isCorrect
                    ? "bg-gradient-to-r from-green-50/80 to-green-100/80 border-green-200/50 shadow-green-100/50"
                    : "bg-gradient-to-r from-red-50/80 to-red-100/80 border-red-200/50 shadow-red-100/50"
                }`}
              >
                <p
                  className={`leading-relaxed text-sm ${
                    submissionResult.isCorrect ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {submissionResult.feedback}
                </p>
              </div>

              {submissionResult.codeAnalysis && (
                <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-lg">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Code Analysis</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-700">{submissionResult.codeAnalysis.quality}%</div>
                      <div className="text-xs text-gray-600">Quality</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-700">{submissionResult.codeAnalysis.efficiency}%</div>
                      <div className="text-xs text-gray-600">Efficiency</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-700">
                        {submissionResult.codeAnalysis.readability}%
                      </div>
                      <div className="text-xs text-gray-600">Readability</div>
                    </div>
                  </div>
                </div>
              )}

              {submissionResult.audioAnalysis && (
                <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-4 shadow-lg">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Audio Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Clarity:</span>
                      <span className="font-medium text-gray-800">{submissionResult.audioAnalysis.clarity}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Explanation:</span>
                      <span className="font-medium text-gray-800">{submissionResult.audioAnalysis.explanation}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Confidence:</span>
                      <span className="font-medium text-gray-800">{submissionResult.audioAnalysis.confidence}%</span>
                    </div>
                    {submissionResult.audioAnalysis.transcription && (
                      <div className="mt-3 p-3 bg-white/80 rounded-lg border border-blue-200/30">
                        <div className="text-xs text-gray-600 mb-1">Transcription:</div>
                        <div className="text-sm text-gray-800 italic">
                          "{submissionResult.audioAnalysis.transcription}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-600/40 transform hover:-translate-y-1 hover:scale-105 active:scale-95 backdrop-blur-sm"
              >
                Continue Learning
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <X className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">No results available</p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
