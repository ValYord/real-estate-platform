'use client'

import { motion } from 'framer-motion'
import { Children, type ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

export interface StaggerProps {
  children: ReactNode
  gap?: number
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

export default function Stagger({ children, gap = 0.08 }: StaggerProps) {
  const reduce = useReducedMotion()

  if (reduce) return <div>{children}</div>

  return (
    <motion.div
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
