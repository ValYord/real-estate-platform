'use client'

import { useState } from 'react'
import Dialog, { DialogTitle, DialogBody } from '@/components/ui/Dialog'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { formatDate } from '@/lib/landlord/format'
import type { TenantApplicationSummary } from '@/lib/landlord/types'
import type { TenantApplicationStatus } from '@/types/database'

const STATUS_LABEL: Record<TenantApplicationStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_VARIANT: Record<TenantApplicationStatus, 'primary' | 'warning' | 'success' | 'neutral'> = {
  new: 'primary',
  reviewing: 'warning',
  approved: 'success',
  rejected: 'neutral',
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-muted flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-text text-right">{value}</span>
    </div>
  )
}

/**
 * `/landlord/screening` "Application detail" (§3.3: "Data + attached
 * document + [Approve] / [Reject] + notes. Approve → move to lease
 * creation (prefill tenant data)."). No document upload in this MVP
 * (application + self-declaration only, per the tool's own scope note).
 */
export default function ApplicationDetailPanel({
  application,
  onClose,
  onUpdated,
}: {
  application: TenantApplicationSummary
  onClose: () => void
  onUpdated: (updated: TenantApplicationSummary) => void
}) {
  const [notes, setNotes] = useState(application.notes ?? '')
  const [pending, setPending] = useState<TenantApplicationStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setStatus = async (status: TenantApplicationStatus) => {
    setPending(status)
    setError(null)
    try {
      const res = await fetch(`/api/landlord/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      if (res.ok) {
        onUpdated({ ...application, status, notes: notes || null })
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{application.applicantName}</DialogTitle>
      <DialogBody className="w-full sm:min-w-[28rem] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{application.unitAddress}</span>
          <Badge variant={STATUS_VARIANT[application.status]}>{STATUS_LABEL[application.status]}</Badge>
        </div>

        <div>
          <Row label="Contact" value={application.contact} />
          <Row label="Employment" value={application.employment ?? '—'} />
          <Row label="Monthly income" value={application.income != null ? String(application.income) : '—'} />
          <Row label="Current residence" value={application.residence ?? '—'} />
          <Row label="References" value={application.references ?? '—'} />
          <Row label="Submitted" value={formatDate(application.createdAt.slice(0, 10))} />
        </div>

        {application.declaration && (
          <div>
            <p className="text-sm text-muted mb-1">Self-declaration</p>
            <p className="text-sm text-text whitespace-pre-wrap">{application.declaration}</p>
          </div>
        )}

        <label htmlFor="app-notes" className="block text-sm font-medium text-text">
          Notes
        </label>
        <textarea
          id="app-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          placeholder="Internal notes (not shared with the applicant)"
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              loading={pending === 'rejected'}
              disabled={pending !== null}
              onClick={() => setStatus('rejected')}
            >
              Reject
            </Button>
            <Button
              size="sm"
              loading={pending === 'approved'}
              disabled={pending !== null}
              onClick={() => setStatus('approved')}
            >
              Approve
            </Button>
            {application.status === 'new' && (
              <Button
                variant="secondary"
                size="sm"
                loading={pending === 'reviewing'}
                disabled={pending !== null}
                onClick={() => setStatus('reviewing')}
              >
                Mark reviewing
              </Button>
            )}
          </div>

          {application.status === 'approved' && (
            <Link
              href={`/landlord/lease?unit=${application.unitId}&application=${application.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Create a lease →
            </Link>
          )}
        </div>
      </DialogBody>
    </Dialog>
  )
}
