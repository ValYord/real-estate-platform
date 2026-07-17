'use client'

import { useState } from 'react'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import type { ApplicationLinkResponse, LandlordUnitOption } from '@/lib/landlord/types'

/**
 * `[Create application link]` (§3.3 "Create application link" — "a
 * shareable link/QR for the tenant"). No QR image in this MVP (accessibility
 * §7 only requires the URL be copyable, not that a QR exists at all: "a
 * copy-able URL next to the QR, not only the QR") — the copyable link
 * itself satisfies that.
 */
export default function ApplicationLinkGenerator({ units }: { units: LandlordUnitOption[] }) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? '')
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!unitId) return
    setLoading(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch('/api/landlord/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId }),
      })
      if (res.status === 201) {
        const body = (await res.json()) as ApplicationLinkResponse
        setLink(body.applicationLink)
      } else {
        setError('Could not create an application link. Please try again.')
      }
    } catch {
      setError('Could not create an application link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (units.length === 0) {
    return (
      <p className="text-sm text-muted">Add a rental unit first to create an application link.</p>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
      <h2 className="text-base font-semibold text-text">Create application link</h2>

      <Field label="Unit" htmlFor="app-link-unit">
        <Select id="app-link-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.address}
            </option>
          ))}
        </Select>
      </Field>

      <Button onClick={generate} loading={loading} disabled={!unitId}>
        Create application link
      </Button>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {link && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            readOnly
            value={link}
            aria-label="Application link"
            className="flex-1 rounded-md border border-border bg-neutral-50 px-3 h-10 text-sm text-text"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="secondary" size="sm" onClick={copy}>
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      )}
    </div>
  )
}
