'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

export interface PageTransitionProps {
  children: ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const reduce = useReducedMotion()
  const pathname = usePathname()

  if (reduce) return <div>{children}</div>

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: [0, 0, 0, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
