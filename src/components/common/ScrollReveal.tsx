'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  animation?: 'fade-up' | 'fade-in' | 'scale-up' | 'slide-left' | 'slide-right' | 'blur-in'
  delay?: number // in ms
  duration?: number // in ms
  threshold?: number
}

export function ScrollReveal({
  children,
  className,
  animation = 'fade-up',
  delay = 0,
  duration = 1000,
  threshold = 0.1,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentRef = ref.current
    if (!currentRef) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add a tiny requestAnimationFrame delay to ensure CSS transitions trigger properly on mount
          requestAnimationFrame(() => {
            setIsVisible(true)
          })
          observer.unobserve(currentRef)
        }
      },
      {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold,
      }
    )

    observer.observe(currentRef)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  // Initial invisible states (Hardware Accelerated)
  const baseStyles = {
    'fade-up': 'opacity-0 translate-y-12',
    'fade-in': 'opacity-0',
    'scale-up': 'opacity-0 scale-90 translate-y-8',
    'slide-left': 'opacity-0 translate-x-12',
    'slide-right': 'opacity-0 -translate-x-12',
    'blur-in': 'opacity-0 blur-xl scale-95',
  }

  // Final visible states
  const activeStyles = {
    'fade-up': 'opacity-100 translate-y-0',
    'fade-in': 'opacity-100',
    'scale-up': 'opacity-100 scale-100 translate-y-0',
    'slide-left': 'opacity-100 translate-x-0',
    'slide-right': 'opacity-100 translate-x-0',
    'blur-in': 'opacity-100 blur-0 scale-100',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all will-change-transform transform-gpu',
        isVisible ? activeStyles[animation] : baseStyles[animation],
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        // Custom Apple-style fluid easing curve
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </div>
  )
}
