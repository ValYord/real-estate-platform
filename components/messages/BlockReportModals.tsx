'use client'

import { useState } from 'react'

const REPORT_REASONS: { value: 'spam' | 'fraud' | 'abuse' | 'other'; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'abuse', label: 'Abuse' },
  { value: 'other', label: 'Other' },
]

interface BlockConfirmModalProps {
  peerName: string
  onConfirm: () => void
  onCancel: () => void
}

export function BlockConfirmModal({ peerName, onConfirm, onCancel }: BlockConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Block user"
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-900">Block {peerName}?</h2>
        <p className="text-sm text-gray-500">
          Neither of you will be able to send messages in this conversation anymore.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            Block
          </button>
        </div>
      </div>
    </div>
  )
}

interface ReportModalProps {
  onSubmit: (reason: 'spam' | 'fraud' | 'abuse' | 'other', note: string) => void
  onCancel: () => void
}

export function ReportModal({ onSubmit, onCancel }: ReportModalProps) {
  const [reason, setReason] = useState<'spam' | 'fraud' | 'abuse' | 'other'>('spam')
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report conversation"
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-900">Report this conversation</h2>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700 mb-1">Reason</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              {r.label}
            </label>
          ))}
        </fieldset>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Add details (optional)"
          aria-label="Report details"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(reason, note)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
