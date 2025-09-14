"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
// Removed incorrect import; use built-in HTMLCanvasElement type

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const particles: Array<{
      x: number
      y: number
      radius: number
      color: string
      opacity: number
      vx: number
      vy: number
    }> = []

    const createParticle = () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 1 + Math.random() * 3,
        color: `rgba(102, 187, 106, ${0.3 + Math.random() * 0.7})`,
        opacity: 0.3 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
      }
    }

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push(createParticle())
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Animate particles
      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        // Bounce off edges
        if (particle.x <= particle.radius || particle.x >= canvas.width - particle.radius) {
          particle.vx *= -1
        }
        if (particle.y <= particle.radius || particle.y >= canvas.height - particle.radius) {
          particle.vy *= -1
        }

        // Draw particle
        ctx.save()
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 relative overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />

        <div
          className="absolute inset-0 opacity-3"
          style={{
            zIndex: 2,
            backgroundImage: `
              linear-gradient(rgba(102, 187, 106, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(102, 187, 106, 0.08) 1px, transparent 1px),
              linear-gradient(45deg, rgba(102, 187, 106, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px, 60px 60px, 120px 120px",
            animation: "gridMove 40s linear infinite, gridPulse 8s ease-in-out infinite alternate",
          }}
        />

        <div className="relative" style={{ zIndex: 3 }}>
          <nav className="absolute top-0 left-0 right-0 flex justify-between items-center p-8 lg:px-16 z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden hover:scale-110 hover:rotate-6 transition-all duration-300 shadow-lg shadow-green-500/30">
                <Image
                  src="/logo.png"
                  alt="YuCode Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-gray-800 text-2xl font-bold">YuCode</span>
            </div>

            <div>
              <Link
                href="/practice"
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 hover:scale-105"
              >
                Try Now
              </Link>
            </div>
          </nav>

          <div className="flex flex-col items-center justify-center h-screen px-8 md:px-12 text-center pt-20">
            <div className="mb-16">
              <h1 className="text-7xl md:text-8xl font-black mb-8 tracking-tight">
                <span className="text-gray-800 drop-shadow-lg">Yu</span>
                <span className="text-green-500 drop-shadow-lg">Code</span>
              </h1>
              <div className="w-40 h-1.5 bg-gradient-to-r from-green-400 to-green-600 mx-auto rounded-full shadow-lg shadow-green-500/30"></div>
            </div>

            <div className="mb-20 max-w-3xl px-12">
              <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed font-light">
                AI-Powered platform to learn code and master technical interviews, all the way from{" "}
                <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent font-medium">
                  Day One
                </span>
              </p>
            </div>

            <div className="mt-12">
              <div className="group">
                <Link
                  href="/practice"
                  className="inline-block bg-gradient-to-r from-green-500 to-green-600 text-white px-10 py-5 rounded-xl text-xl font-bold shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                >
                  Practice Now
                  <span className="ml-3 group-hover:translate-x-1 transition-transform duration-300">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        @keyframes gridPulse {
          0% { opacity: 0.03; }
          100% { opacity: 0.08; }
        }
      `}</style>
    </>
  )
}
