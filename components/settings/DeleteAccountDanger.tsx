'use client'

import { useRef, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from './SettingsContext'

const CONFIRM_TEXT = 'DELETE'

/**
 * Account tab — danger zone (§3.3, Scenario C). Requires typing "DELETE"
 * before the destructive button becomes active; on confirm, calls
 * DELETE /api/users/me and redirects Home.
 */
export default function DeleteAccountDanger() {
  const router = useRouter()
  const { showToast } = useSettings()
  const [modalOpen, setModalOpen] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const canConfirm = typedText === CONFIRM_TEXT

  const handleDelete = async () => {
    if (!canConfirm) return
    setDeleting(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_TEXT }),
      })
      if (!res.ok) {
        showToast('Could not delete your account. Try again.', 'error')
        setDeleting(false)
        return
      }
      showToast('Your account has been deleted')
      router.push('/')
    } catch {
      showToast('Could not delete your account. Try again.', 'error')
      setDeleting(false)
    }
  }

  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Danger zone</h3>
      <div className="max-w-md border border-red-200 rounded-xl p-4 bg-red-50/50">
        <p className="text-sm text-gray-700 mb-3">
          Deleting your account permanently removes your listings, favorites, and messages. This
          action is irreversible.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="bg-red-600 text-white h-10 rounded-lg px-4 hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          Delete account
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-desc"
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle aria-hidden="true" className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 id="delete-account-title" className="text-base font-semibold text-gray-900">
                  Delete your account?
                </h2>
                <p id="delete-account-desc" className="text-sm text-gray-600 mt-0.5">
                  This will permanently delete your listings, favorites, and all messages. This
                  cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <label htmlFor="delete-confirm-text" className="text-sm font-medium text-gray-700">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm-text"
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              autoComplete="off"
              className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-500"
            />

            <div className="flex gap-3 justify-end mt-5">
              <button
                ref={cancelRef}
                onClick={() => {
                  setModalOpen(false)
                  setTypedText('')
                }}
                className={cn(
                  'px-4 h-10 text-sm font-medium rounded-lg border border-gray-300 text-gray-700',
                  'hover:bg-gray-50 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                )}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={!canConfirm || deleting}
                className={cn(
                  'px-4 h-10 text-sm font-medium rounded-lg text-white',
                  'bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600',
                )}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
