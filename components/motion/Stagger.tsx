'use client'

import { motion } from 'framer-motion'
import { Children, forwardRef, type ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

export interface StaggerProps {
  children: ReactNode
  gap?: number
  /**
   * Optional layout classes for the outer container (e.g. `flex flex-wrap
   * gap-3` for a stat-card row, `flex overflow-x-auto` for a carousel).
   * Needed because each direct child gets wrapped in its own per-item
   * `motion.div` — without a flex/grid class on the outer element those
   * wrappers stack as block-level `<div>`s instead of laying out side by
   * side.
   */
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

/**
 * Forwards its ref to the outer container (needed by callers that scroll the
 * row programmatically, e.g. a horizontal carousel's prev/next buttons).
 */
const Stagger = forwardRef<HTMLDivElement, StaggerProps>(function Stagger(
  { children, gap = 0.08, className },
  ref,
) {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-64px' }}
      variants={container(gap)}
      className={className}
    >
      {Children.map(children, (child) => (
        <motion.div variants={item} transition={{ duration: 0.22, ease: [0, 0, 0, 1] }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
})

export default Stagger
