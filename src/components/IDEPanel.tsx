"use client"

import { useState } from "react"
import CodeEditor from "./CodeEditor"
import { lessons } from "../data/lessons"
import { useLessonContext } from "./PracticeView"

export default function IDEPanel() {
  const [showLessonMenu, setShowLessonMenu] = useState(false)
  const { currentLessonId, setCurrentLessonId } = useLessonContext()

  const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId) || lessons[0]

  return (
    <div className="w-[65%] flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-card-foreground">{currentLesson.title}</h2>
            <span
              className={`px-3 py-1 text-white text-sm font-medium rounded-lg ${
                currentLesson.difficulty === "Beginner"
                  ? "bg-green-600"
                  : currentLesson.difficulty === "Intermediate"
                    ? "bg-yellow-600"
                    : "bg-red-600"
              }`}
            >
              {currentLesson.category}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <CodeEditor />
      </div>
    </div>
  )
}
