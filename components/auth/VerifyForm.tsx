'use client'

import { useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { safeNext } from '@/lib/auth/safeNext'
import OtpInput from './OtpInput'
import ResendButton from './ResendButton'

type Step = 'email' | 'phone'

export default function VerifyForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const email = searchParams.get('email') ?? ''
  const nextPath = safeNext(searchParams.get('next') ?? undefined)

  const [step, setStep] = useState<Step>('email')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleVerify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)

    try {
      const endpoint =
        step === 'email' ? '/api/auth/verify-email' : '/api/auth/verify-phone'
      const payload =
        step === 'email' ? { email, code } : { code }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        if (res.status === 410) {
          setError('The code has expired. Please request a new one.')
        } else if (json.error === 'invalid_code') {
          setError('The code is wrong or expired.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        return
      }

      if (step === 'email') {
        setCode('')
        setStep('phone')
      } else {
        setSuccess(true)
        setTimeout(() => router.push(nextPath), 1500)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = useCallback(async () => {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: step }),
    })
    if (!res.ok) {
      setError('Could not resend. Please wait a moment.')
    }
  }, [step])

  const handleSkipPhone = () => {
    router.push(nextPath)
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px] text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-900">Account verified!</h2>
        <p className="text-sm text-gray-500 mt-1">Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px]">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            step === 'email'
              ? 'bg-primary text-white'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {step === 'email' ? 'Step 1/2' : '✓ Step 1'}
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            step === 'phone' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          Step 2/2
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mt-3">
        Verify your account
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        {step === 'email'
          ? `Enter the 6-digit code sent to ${email || 'your email'}`
          : 'Enter the 6-digit SMS code sent to your phone'}
      </p>

      {/* Error */}
      {error && (
        <div role="alert" className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* OTP input */}
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={handleVerify}
          error={!!error}
          disabled={loading}
          aria-label={
            step === 'email'
              ? 'Email verification code'
              : 'Phone verification code'
          }
        />

        {/* Verify button */}
        <button
          type="button"
          onClick={handleVerify}
          disabled={code.length !== 6 || loading}
          className="bg-primary text-white h-11 rounded-lg w-full font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Verifying…
            </span>
          ) : (
            'Verify'
          )}
        </button>

        {/* Resend button */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>Didn&apos;t receive a code?</span>
          <ResendButton onResend={handleResend} cooldownSec={60} />
        </div>

        {/* Skip phone (only on phone step) */}
        {step === 'phone' && (
          <div className="text-center">
            <button
              type="button"
              onClick={handleSkipPhone}
              className="text-sm text-gray-400 hover:text-gray-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
