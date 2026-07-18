'use client'

import { motion } from 'framer-motion'
import { Children, type ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

// Mirrors framer-motion's internal (unexported) viewport margin type so
// callers get autocomplete/validation without reaching into its internals.
type MarginValue = `${number}px` | `${number}%`
type ViewportMargin =
  | MarginValue
  | `${MarginValue} ${MarginValue}`
  | `${MarginValue} ${MarginValue} ${MarginValue}`
  | `${MarginValue} ${MarginValue} ${MarginValue} ${MarginValue}`

export interface StaggerProps {
  children: ReactNode
  gap?: number
  className?: string
  /**
   * Root margin passed to the scroll-trigger's IntersectionObserver (see
   * framer-motion's `viewport.margin`). Defaults to `'-64px'`, which requires
   * an element to be well inside the viewport before it reveals — fine for
   * content the user is guaranteed to scroll slowly past.
   *
   * For content that must never be stuck at its pre-animation (invisible)
   * state — e.g. sections positioned well past the first viewport on a
   * short, static page, which a real user reaches quickly, but which tools
   * that render/capture the page without a genuine scroll gesture (visual
   * regression screenshots, print/export, crawlers) would never scroll into
   * view — pass a generous positive bottom margin (e.g. `'0px 0px 2000px
   * 0px'`) so the reveal fires shortly after mount instead of waiting on a
   * real scroll event.
   */
  margin?: ViewportMargin
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

export default function Stagger({ children, gap = 0.08, className, margin = '-64px' }: StaggerProps) {
  const reduce = useReducedMotion()

  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin }}
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
