"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Send } from "lucide-react"

interface Message {
  id: number
  text: string
  timestamp: string
  sender: "teacher" | "user" // Changed from recruiter to teacher
}

export default function AIInterviewer() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Welcome! I'm your coding teacher. I'll help guide you through Python concepts and prepare you for programming success.", // Updated message from recruiter to teacher
      timestamp: "10:30 AM",
      sender: "teacher", // Changed from recruiter to teacher
    },
    {
      id: 2,
      text: "Take your time to understand each concept. Practice makes perfect - let's build your coding skills together!",
      timestamp: "10:30 AM",
      sender: "teacher", // Changed from recruiter to teacher
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const addMessage = (text: string, sender: "teacher" | "user" = "teacher") => {
    // Changed from recruiter to teacher
    const newMessage: Message = {
      id: messages.length + 1,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return

    const userMessage = userInput.trim()
    setUserInput("")

    // Add user message
    addMessage(userMessage, "user")

    // Show typing indicator
    setIsTyping(true)
    setIsLoading(true)

    try {
      const response = await fetch("/api/teacher/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          context: messages.slice(-5), // Send last 5 messages for context
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTimeout(() => {
          setIsTyping(false)
          addMessage(data.response, "teacher") // Changed from recruiter to teacher
          setIsLoading(false)
        }, 1500)
      } else {
        throw new Error("Failed to get response")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setTimeout(() => {
        setIsTyping(false)
        addMessage("I'm having trouble responding right now. Please try again later.", "teacher") // Changed from recruiter to teacher
        setIsLoading(false)
      }, 1500)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      addMessage(
        "Remember, coding is about practice and understanding. Let's break down this problem into smaller steps.",
      )
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="w-1/4 bg-card border-l border-border flex flex-col shadow-card">
      <div className="p-4 border-b border-border bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground">Python Teacher</h3>{" "}
          {/* Changed from Recruiter to Teacher */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-xs text-primary font-semibold">READY</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${message.sender === "teacher" ? "bg-green-500" : "bg-blue-500"}`}
              ></div>
              <span
                className={`text-xs font-semibold uppercase ${message.sender === "teacher" ? "text-green-600" : "text-blue-600"}`}
              >
                {message.sender === "teacher" ? "TEACHER" : "YOU"}
              </span>
            </div>
            <div
              className={`text-sm leading-relaxed text-foreground pl-4 border-l-4 p-3 rounded-r-md ${
                message.sender === "teacher" ? "border-green-500 bg-green-50/50" : "border-blue-500 bg-blue-50/50"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-green-600 font-semibold uppercase">TEACHER</span>
            </div>
            <div className="flex items-center space-x-2 pl-4 border-l-4 border-green-500 bg-green-50/30 p-3 rounded-r-md">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce"></div>
                <div
                  className="w-1 h-1 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-1 h-1 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span className="text-sm text-muted-foreground">typing...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-white">
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask the teacher anything..." // Updated placeholder from recruiter to teacher
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-background/50"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isLoading}
              className="flex-shrink-0 p-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() =>
              addMessage(
                "Let's think about this step by step. What's the first thing we need to do? Try breaking it down into smaller parts.",
              )
            }
            className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            Get Hint
          </button>

          <button
            onClick={() =>
              addMessage(
                "Here's the complete solution: [Solution would be provided here based on the current problem]. Study this approach and try to understand each step.",
              )
            }
            className="w-full px-4 py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="px-4 py-3 bg-card border-t border-border">
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-primary">Ready to Learn Python</span>
        </div>
      </div>
    </div>
  )
}
