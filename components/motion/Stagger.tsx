'use client'

import { motion } from 'framer-motion'
import { Children, type ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'
import { cn } from '@/lib/utils'

export interface StaggerProps {
  children: ReactNode
  gap?: number
  /** Optional classes for the root element — e.g. `grid grid-cols-3 gap-4` to
   *  stagger a multi-column layout instead of the default stacked block. */
  className?: string
}

const container = (gap: number) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: gap },
  },
})

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function Stagger({ children, gap = 0.08, className }: StaggerProps) {
  const reduce = useReducedMotion()

  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-64px' }}
      variants={container(gap)}
    >
      {Children.map(children, (child) => (
        <motion.div variants={item} transition={{ duration: 0.22, ease: [0, 0, 0, 1] }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
