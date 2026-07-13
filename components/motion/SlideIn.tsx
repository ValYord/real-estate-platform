'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

export type SlideDirection = 'up' | 'down' | 'left' | 'right'

export interface SlideInProps {
  children: ReactNode
  direction?: SlideDirection
  delay?: number
}

const OFFSET = 24

function offsetFor(direction: SlideDirection): { x?: number; y?: number } {
  switch (direction) {
    case 'up':
      return { y: OFFSET }
    case 'down':
      return { y: -OFFSET }
    case 'left':
      return { x: OFFSET }
    case 'right':
      return { x: -OFFSET }
  }
}

export default function SlideIn({ children, direction = 'up', delay = 0 }: SlideInProps) {
  const reduce = useReducedMotion()

  if (reduce) return <div>{children}</div>

  const offset = offsetFor(direction)

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.28, ease: [0, 0, 0, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
