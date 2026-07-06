'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface WizardStep {
  label: string
  shortLabel: string
}

interface WizardProgressBarProps {
  steps: WizardStep[]
  current: number
  /** Steps the user may jump to (0-indexed). In edit mode = all; in create mode = visited steps */
  jumpable: Set<number>
  onJump: (step: number) => void
}

export const WIZARD_STEPS: WizardStep[] = [
  { label: 'Type', shortLabel: '1' },
  { label: 'Location', shortLabel: '2' },
  { label: 'Details', shortLabel: '3' },
  { label: 'Media', shortLabel: '4' },
  { label: 'Price', shortLabel: '5' },
  { label: 'Preview', shortLabel: '6' },
]

/**
 * Wizard progress bar.
 * Desktop: numbered circles with full labels and connectors.
 * Mobile: compact "Step N/6" text + dot row.
 */
export default function WizardProgressBar({
  steps,
  current,
  jumpable,
  onJump,
}: WizardProgressBarProps) {
  return (
    <>
      {/* ── Desktop progress bar ── */}
      <nav
        aria-label="Wizard progress"
        className="hidden md:flex items-center gap-0 mb-8"
      >
        {steps.map((step, idx) => {
          const isDone = idx < current
          const isActive = idx === current
          const isTodo = idx > current
          const canJump = jumpable.has(idx)

          return (
            <div key={idx} className="flex items-center flex-1 min-w-0">
              {/* Step circle */}
              <button
                type="button"
                onClick={() => canJump && onJump(idx)}
                disabled={!canJump}
                aria-label={`Step ${idx + 1}: ${step.label}${isDone ? ' — completed' : isActive ? ' — current' : ''}`}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isDone && 'bg-primary text-white',
                  isActive && 'border-2 border-primary text-primary bg-white',
                  isTodo && 'border border-gray-300 text-gray-400 bg-white',
                  canJump && !isActive ? 'cursor-pointer hover:border-primary hover:text-primary' : '',
                  !canJump && isTodo ? 'cursor-not-allowed' : '',
                )}
              >
                {isDone ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{idx + 1}</span>
                )}
              </button>

              {/* Step label (visible on lg+) */}
              <span
                className={cn(
                  'hidden lg:block ml-2 text-xs font-medium whitespace-nowrap',
                  isDone && 'text-primary',
                  isActive && 'text-primary',
                  isTodo && 'text-gray-400',
                )}
              >
                {step.label}
              </span>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    isDone ? 'bg-primary' : 'bg-gray-200',
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Mobile compact progress ── */}
      <div className="md:hidden flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-gray-700">
          Step {current + 1}/{steps.length}
        </span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {steps.map((_, idx) => {
            const isDone = idx < current
            const isActive = idx === current
            return (
              <div
                key={idx}
                className={cn(
                  'rounded-full transition-all',
                  isDone && 'w-2 h-2 bg-primary',
                  isActive && 'w-3 h-3 bg-primary',
                  !isDone && !isActive && 'w-2 h-2 bg-gray-300',
                )}
              />
            )
          })}
        </div>
      </div>

      {/* Screen reader live region for step changes */}
      <div
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label={`Listing wizard: step ${current + 1} of ${steps.length}`}
        className="sr-only"
      />
    </>
  )
}
