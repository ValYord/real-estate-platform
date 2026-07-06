'use client'

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WizardNavProps {
  step: number
  totalSteps: number
  canContinue: boolean
  isPublishing?: boolean
  onBack: () => void
  onContinue: () => void
}

/**
 * Bottom navigation for the wizard.
 * Mobile: fixed to bottom with border-t.
 * Desktop: inline below the form content.
 */
export default function WizardNav({
  step,
  totalSteps,
  canContinue,
  isPublishing = false,
  onBack,
  onContinue,
}: WizardNavProps) {
  const isLastStep = step === totalSteps - 1
  const isFirstStep = step === 0

  return (
    <>
      {/* Mobile fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] h-16 flex items-center px-4 gap-3">
        {!isFirstStep && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 h-11 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue || isPublishing}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
            isLastStep
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-primary text-white hover:bg-primary/90',
          )}
        >
          {isPublishing && (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          )}
          {isLastStep ? (isPublishing ? 'Publishing…' : '🚀 Publish') : 'Continue'}
          {!isLastStep && !isPublishing && (
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Desktop inline nav */}
      <div className="hidden md:flex items-center gap-3 mt-8">
        {!isFirstStep && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 h-11 px-6 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue || isPublishing}
          className={cn(
            'flex items-center gap-2 h-11 px-6 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
            isLastStep
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-primary text-white hover:bg-primary/90',
          )}
        >
          {isPublishing && (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          )}
          {isLastStep ? (isPublishing ? 'Publishing…' : '🚀 Publish') : 'Continue'}
          {!isLastStep && !isPublishing && (
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </>
  )
}
