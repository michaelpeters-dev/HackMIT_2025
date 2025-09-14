"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <div className="text-gray-600">Loading editor...</div>
    </div>
  ),
})

interface SyntaxError {
  line: number
  message: string
  type: "error" | "warning"
}

export default function CodeEditor() {
  const [code, setCode] = useState(`# Write your solution here`)
  const [output, setOutput] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [skulptLoaded, setSkulptLoaded] = useState(false)
  const editorRef = useRef<any>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Load Skulpt Python interpreter
  useEffect(() => {
    const loadSkulpt = async () => {
      try {
        // Check if Skulpt is already loaded
        if ((window as any).Sk) {
          console.log("[v0] Skulpt already loaded")
          setSkulptLoaded(true)
          return
        }

        console.log("[v0] Starting Skulpt loading process")

        const loadScript = (src: string, fallbackSrc?: string): Promise<void> => {
          return new Promise((resolve, reject) => {
            const script = document.createElement("script")
            script.src = src
            script.onload = () => {
              console.log(`[v0] Successfully loaded script: ${src}`)
              resolve()
            }
            script.onerror = () => {
              console.log(`[v0] Failed to load script: ${src}`)
              if (fallbackSrc) {
                console.log(`[v0] Trying fallback: ${fallbackSrc}`)
                const fallbackScript = document.createElement("script")
                fallbackScript.src = fallbackSrc
                fallbackScript.onload = () => {
                  console.log(`[v0] Successfully loaded fallback script: ${fallbackSrc}`)
                  resolve()
                }
                fallbackScript.onerror = () => {
                  console.log(`[v0] Failed to load fallback script: ${fallbackSrc}`)
                  reject(new Error(`Failed to load both ${src} and ${fallbackSrc}`))
                }
                document.head.appendChild(fallbackScript)
              } else {
                reject(new Error(`Failed to load ${src}`))
              }
            }
            document.head.appendChild(script)
          })
        }

        // Load Skulpt main library with fallback
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/skulpt/0.11.1/skulpt.min.js",
          "https://unpkg.com/skulpt@0.11.1/dist/skulpt.min.js",
        )

        // Load Skulpt stdlib with fallback
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/skulpt/0.11.1/skulpt-stdlib.js",
          "https://unpkg.com/skulpt@0.11.1/dist/skulpt-stdlib.js",
        )

        // Verify Skulpt is properly loaded
        if ((window as any).Sk && (window as any).Sk.misceval) {
          console.log("[v0] Skulpt loaded successfully with all dependencies")
          setSkulptLoaded(true)
        } else {
          throw new Error("Skulpt loaded but missing required components")
        }
      } catch (error) {
        console.log("[v0] Error loading Skulpt:", error)
        console.log("[v0] Will use fallback execution mode")
        setSkulptLoaded(false)
      }
    }

    const timeoutId = setTimeout(loadSkulpt, 100)
    return () => clearTimeout(timeoutId)
  }, [])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor

    // Configure Python language features
    monaco.languages.python?.pythonDefaults?.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    monaco.editor.defineTheme("custom-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff", // white background
        "editor.foreground": "#000000", // black text
        "editor.lineHighlightBackground": "#f5f5f5",
        "editorLineNumber.foreground": "#666666",
        "editor.selectionBackground": "#e0e0e0",
      },
    })

    monaco.editor.setTheme("custom-light")

    // Add custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // Trigger code execution on Ctrl/Cmd + Enter
      if ((window as any).executeCode) {
        ;(window as any).executeCode()
      }
    })
  }

  const convertFStringsToFormat = (code: string): string => {
    // Convert f-strings like f"Hello {name}" to "Hello {}".format(name)
    return code
      .replace(/f"([^"]*?)"/g, (match, content) => {
        const variables: string[] = []
        const formatString = content.replace(/\{([^}]+)\}/g, (varMatch: string, varName: string) => {
          variables.push(varName.trim())
          return "{}"
        })

        if (variables.length > 0) {
          return `"${formatString}".format(${variables.join(", ")})`
        }
        return `"${formatString}"`
      })
      .replace(/f'([^']*?)'/g, (match, content) => {
        const variables: string[] = []
        const formatString = content.replace(/\{([^}]+)\}/g, (varMatch: string, varName: string) => {
          variables.push(varName.trim())
          return "{}"
        })

        if (variables.length > 0) {
          return `'${formatString}'.format(${variables.join(", ")})`
        }
        return `'${formatString}'`
      })
  }

  const executeCode = async (code: string): Promise<string> => {
    try {
      setIsExecuting(true)
      console.log("[v0] Starting code execution with code:", code)
      console.log("[v0] Skulpt loaded:", skulptLoaded)
      console.log("[v0] Skulpt object available:", !!(window as any).Sk)

      if (skulptLoaded && (window as any).Sk && (window as any).Sk.misceval) {
        console.log("[v0] Using Skulpt for Python execution")

        const convertedCode = convertFStringsToFormat(code)
        console.log("[v0] Original code:", code)
        console.log("[v0] Converted code:", convertedCode)

        return await new Promise<string>((resolve) => {
          let output = ""

          // Configure Skulpt
          ;(window as any).Sk.pre = "output"
          ;(window as any).Sk.configure({
            output: (text: string) => {
              console.log("[v0] Skulpt output:", text)
              output += text
            },
            read: (x: string) => {
              if (
                (window as any).Sk.builtinFiles === undefined ||
                (window as any).Sk.builtinFiles["files"][x] === undefined
              ) {
                throw "File not found: '" + x + "'"
              }
              return (window as any).Sk.builtinFiles["files"][x]
            },
          })

          console.log("[v0] Skulpt configured, starting execution")
          ;(window as any).Sk.misceval
            .asyncToPromise(() => {
              return (window as any).Sk.importMainWithBody("<stdin>", false, convertedCode, true)
            })
            .then(() => {
              console.log("[v0] Skulpt execution completed successfully, output:", output)
              resolve(output || "Code executed successfully!")
            })
            .catch((err: any) => {
              console.log("[v0] Skulpt execution error:", err)
              resolve(`Error: ${err.toString()}`)
            })
        })
      } else {
        console.log("[v0] Skulpt not available, using enhanced fallback")

        const lines = code
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#"))
        let output = ""

        console.log("[v0] Processing lines with fallback:", lines)

        for (const line of lines) {
          if (line.startsWith("print(")) {
            // Extract content from print statement
            const match = line.match(/print$$(.+)$$/)
            if (match) {
              let content = match[1].trim()
              console.log("[v0] Found print statement, content:", content)
              // Remove quotes if present
              if (
                (content.startsWith('"') && content.endsWith('"')) ||
                (content.startsWith("'") && content.endsWith("'"))
              ) {
                content = content.slice(1, -1)
              }
              output += content + "\n"
            }
          }
        }

        console.log("[v0] Fallback execution completed, output:", output)
        return output || "Code executed successfully!"
      }
    } catch (error) {
      console.log("[v0] Execution error:", error)
      return `Execution Error: ${error}`
    } finally {
      setIsExecuting(false)
      console.log("[v0] Code execution finished")
    }
  }

  useEffect(() => {
    // Make executeCode available globally for FooterControls
    console.log("[v0] Setting up global executeCode function")
    ;(window as any).executeCode = async () => {
      console.log("[v0] executeCode called from FooterControls")
      console.log("[v0] Current code to execute:", code)
      console.log("[v0] Skulpt loaded status:", skulptLoaded)
      const result = await executeCode(code)
      console.log("[v0] Execution result:", result)
      setOutput(result)
      setHasRun(true)
      console.log("[v0] Output set and hasRun set to true")
    }
    ;(window as any).getCurrentCode = () => {
      console.log("[v0] getCurrentCode called, returning current code:", code)
      return code
    }
    console.log("[v0] Global functions registered successfully")
  }, [code, skulptLoaded])

  useEffect(() => {
    if (outputRef.current && output) {
      const timeoutId = setTimeout(() => {
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [output])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="python"
          value={code}
          onChange={(value) => setCode(value || "")}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "JetBrains Mono, monospace",
            lineHeight: 1.5,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: "line",
            selectOnLineNumbers: true,
            lineNumbers: "on",
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
            },
            // Enable IntelliSense and error detection
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: "currentDocument",
            // Enable bracket matching and auto-closing
            matchBrackets: "always",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {hasRun && (
        // Made output section flexible instead of fixed height
        <div className="flex-1 min-h-0 max-h-80 border-t border-gray-200 bg-white flex flex-col">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <div className="text-sm font-medium text-gray-900">
              Output {isExecuting && <span className="text-blue-500">(Running...)</span>}
            </div>
          </div>

          <div
            ref={outputRef}
            className="flex-1 min-h-0 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
          >
            {output ? (
              <pre className="font-mono text-sm text-gray-900 whitespace-pre-wrap">{output}</pre>
            ) : (
              <div className="text-gray-500 text-sm">
                {isExecuting ? "Executing code..." : "Click 'Run' to see output..."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}