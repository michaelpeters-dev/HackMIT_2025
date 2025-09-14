"use client"

import { useState } from "react"
import { lessons } from "../data/lessons"
import { useLessonContext } from "./PracticeView"

export default function TaskSidebar() {
  const [showHints, setShowHints] = useState(false)
  const [showLessonMenu, setShowLessonMenu] = useState(false)
  const { currentLessonId, setCurrentLessonId } = useLessonContext()

  const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId) || lessons[0]

  return (
    <div className="w-1/4 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-card-foreground">{currentLesson.title}</h2>
          <button
            onClick={() => setShowLessonMenu(!showLessonMenu)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Open lesson menu"
          >
            <div className="w-5 h-5 flex flex-col justify-center space-y-1">
              <div className="w-full h-0.5 bg-muted-foreground"></div>
              <div className="w-full h-0.5 bg-muted-foreground"></div>
              <div className="w-full h-0.5 bg-muted-foreground"></div>
            </div>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 text-primary-foreground text-sm font-medium rounded ${
              currentLesson.difficulty === "Beginner"
                ? "bg-green-600"
                : currentLesson.difficulty === "Medium"
                  ? "bg-yellow-600"
                  : "bg-red-600"
            }`}
          >
            {currentLesson.difficulty}
          </span>
          <span className="text-muted-foreground text-sm">{currentLesson.category}</span>
        </div>

        {showLessonMenu && (
          <div className="absolute top-16 right-6 bg-card border border-border rounded-lg shadow-lg z-50 w-80 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-card-foreground">All Lessons</h3>
            </div>
            <div className="p-2">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setCurrentLessonId(lesson.id)
                    setShowLessonMenu(false)
                  }}
                  className={`w-full text-left p-3 rounded-lg hover:bg-muted transition-colors ${
                    lesson.id === currentLessonId ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-card-foreground text-sm">{lesson.title}</div>
                      <div className="text-xs text-muted-foreground">{lesson.category}</div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        lesson.difficulty === "Beginner"
                          ? "bg-green-100 text-green-800"
                          : lesson.difficulty === "Medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {lesson.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Interview Question
          </h3>
          <div className="text-sm text-card-foreground leading-relaxed space-y-3">
            <div className="bg-secondary p-4 rounded">
              <p className="italic text-secondary-foreground">{currentLesson.interviewQuestion}</p>
            </div>
            <p className="text-card-foreground">{currentLesson.description}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Your Task</h3>
          <div className="bg-muted rounded p-4 border border-border">
            <div className="font-mono text-sm space-y-2 text-card-foreground">
              {currentLesson.tasks.map((task, index) => (
                <div key={index}>
                  {index + 1}. {task}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Expected Output</h3>
          <div className="bg-muted rounded p-4 border border-border">
            <div className="font-mono text-sm space-y-1">
              <div className="text-muted-foreground"># Expected output:</div>
              {currentLesson.expectedOutput.map((output, index) => (
                <div key={index} className="text-card-foreground">
                  {output}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Learning Objectives
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            {currentLesson.learningObjectives.map((objective, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full"></div>
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center space-x-3 text-sm font-semibold text-muted-foreground hover:text-card-foreground transition-colors uppercase tracking-wide"
          >
            <span className="w-4 h-4 text-center text-primary">{showHints ? "▼" : "▶"}</span>
            <span>Hints</span>
          </button>

          {showHints && (
            <div className="mt-4 text-sm text-muted-foreground space-y-3 pl-7">
              {currentLesson.hints.map((hint, index) => (
                <div key={index}>
                  <span className="font-semibold text-card-foreground">Hint {index + 1}:</span> {hint}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-secondary p-4 rounded">
          <h3 className="text-sm font-semibold text-secondary-foreground mb-3 uppercase tracking-wide">
            Why This Matters
          </h3>
          <p className="text-sm text-secondary-foreground leading-relaxed mb-3">
            {currentLesson.whyItMatters.description}
          </p>
          <ul className="text-sm text-secondary-foreground space-y-2">
            {currentLesson.whyItMatters.points.map((point, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full"></div>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
