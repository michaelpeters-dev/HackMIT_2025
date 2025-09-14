"use client"

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle system
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      life: number
      maxLife: number
    }> = []

    // Create particles
    const createParticle = () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        life: 0,
        maxLife: Math.random() * 200 + 100
      }
    }

    // Initialize particles
    for (let i = 0; i < 30; i++) {
      particles.push(createParticle())
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particles.forEach((particle, index) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life++

        // Fade out over time
        const lifeRatio = particle.life / particle.maxLife
        particle.opacity = (1 - lifeRatio) * 0.6

        // Reset particle if it's dead or off screen
        if (particle.life >= particle.maxLife || 
            particle.x < 0 || particle.x > canvas.width || 
            particle.y < 0 || particle.y > canvas.height) {
          particles[index] = createParticle()
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(59, 130, 246, ${particle.opacity})`
        ctx.fill()
      })

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - distance / 100)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
        {/* Animated Background Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1 }}
        />

        {/* Subtle Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            zIndex: 2,
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            animation: 'gridMove 30s linear infinite'
          }} />


        {/* Main Content */}
        <div className="relative" style={{ zIndex: 3 }}>
          {/* Enhanced Navigation */}
          <nav className="absolute top-0 left-0 right-0 flex justify-between items-center p-8 lg:px-16 z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center hover:scale-110 hover:rotate-6 transition-all duration-300 shadow-lg shadow-green-500/30">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-white text-2xl font-bold">CodeMind</span>
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

          {/* Hero Section - Enhanced Design */}
          <div className="flex flex-col items-center justify-center h-screen px-8 md:px-12 text-center pt-20">
            {/* Main Logo/Title */}
            <div className="mb-16">
              <h1 className="text-7xl md:text-8xl font-black mb-8 tracking-tight">
                <span className="text-white drop-shadow-2xl">
                  Code
                </span>
                <span className="text-green-400 drop-shadow-2xl">
                  Mind
                </span>
              </h1>
              <div className="w-40 h-1.5 bg-gradient-to-r from-green-400 to-green-600 mx-auto rounded-full shadow-2xl shadow-green-500/50"></div>
            </div>

            {/* Enhanced Tagline */}
            <div className="mb-20 max-w-3xl px-12">
              <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed font-light">
                First AI-native technical interviewer that evaluates{" "}
                <span className="bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent font-medium"> 
                  how you solve problems
                </span>, 
                not just <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent font-medium">
                  what you solve
                </span>
              </p>
              <p className="text-sm text-gray-500 font-light">
                Experience the future of technical interviews with AI that understands your thought process
              </p>
            </div>

            {/* Enhanced CTA Button */}
            <div className="mt-12">
              <div className="group">
                <Link
                  href="/practice"
                  className="inline-block bg-gradient-to-r from-green-500 to-green-600 text-white px-10 py-5 rounded-xl text-xl font-bold shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                >
                  Start Practice Now
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
          100% { transform: translate(80px, 80px); }
        }
        
        
      `}</style>
    </>
  )
}