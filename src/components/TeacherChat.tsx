"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Send, User, Bot } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "user" | "teacher"
  timestamp: Date
}

export default function TeacherChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hi! I'm your AI teacher assistant powered by Claude. I can help you with coding questions, learning concepts, and understanding programming fundamentals. How can I assist you today?",
      sender: "teacher",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/teacher/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          context: {
            userId: "user-123",
            sessionId: "session-" + Date.now(),
            messageHistory: messages.slice(-5),
            lessonTitle: "General Programming Help",
            lessonDescription: "Interactive programming assistance and learning support",
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

      const teacherMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message || "I'm sorry, I couldn't process that request right now.",
        sender: "teacher",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, teacherMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          error instanceof Error && error.message.includes("api_key")
            ? "I need to be configured with a Claude API key to work properly. Please add your ANTHROPIC_API_KEY to the environment variables."
            : "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        sender: "teacher",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 border-b border-border bg-card">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Talk to the Teacher</h3>
          <p className="text-sm text-muted-foreground">Get learning help and coding guidance powered by Claude</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`flex items-start space-x-2 max-w-[80%] ${
                message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.sender === "user" ? "bg-blue-100" : "bg-green-100"
                }`}
              >
                {message.sender === "user" ? (
                  <User className="w-4 h-4 text-blue-600" />
                ) : (
                  <Bot className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div
                className={`rounded-lg p-3 border-l-4 ${
                  message.sender === "user"
                    ? "bg-blue-50 text-blue-900 border-l-blue-500"
                    : "bg-green-50 text-green-900 border-l-green-500"
                }`}
              >
                <div
                  className="text-sm whitespace-pre-wrap prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: message.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                      .replace(
                        /```python\n([\s\S]*?)\n```/g,
                        '<pre class="bg-gray-100 p-2 rounded mt-2 mb-2 overflow-x-auto"><code>$1</code></pre>',
                      )
                      .replace(
                        /```([\s\S]*?)```/g,
                        '<pre class="bg-gray-100 p-2 rounded mt-2 mb-2 overflow-x-auto"><code>$1</code></pre>',
                      )
                      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
                      .replace(/\n\n/g, "<br><br>")
                      .replace(/\n/g, "<br>"),
                  }}
                />
                <p className={`text-xs mt-1 opacity-70`}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-green-600" />
              </div>
              <div className="bg-green-50 border-l-4 border-l-green-500 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about coding concepts, programming help, or learning guidance..."
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={!inputMessage.trim() || isLoading} size="sm" className="self-end">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
