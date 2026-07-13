'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from '@/i18n/navigation'
import type { UserMe } from '@/lib/settings/types'
import UnsavedChangesModal from './UnsavedChangesModal'
import SettingsToast, { type ToastVariant } from './SettingsToast'

interface DirtyFormEntry {
  dirty: boolean
  /** Attempts to save the dirty form; resolves false if the save failed. */
  onSave: () => Promise<boolean>
  /** Discards in-progress edits (resets the form to its last-saved values). */
  onDiscard: () => void
}

interface SettingsContextValue {
  user: UserMe
  updateUser: (patch: Partial<UserMe>) => void
  showToast: (message: string, variant?: ToastVariant) => void
  /** Registers (or clears, with `null`) the active tab's dirty-form state. */
  registerDirtyForm: (entry: DirtyFormEntry | null) => void
  /** Navigates to `href`, prompting first if the active tab has unsaved changes. */
  guardedNavigate: (href: string) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>')
  return ctx
}

/** Registers the calling form's dirty state for the unsaved-changes leave guard. */
export function useDirtyFormGuard(entry: DirtyFormEntry): void {
  const { registerDirtyForm } = useSettings()
  useEffect(() => {
    registerDirtyForm(entry)
    return () => registerDirtyForm(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.dirty, entry.onSave, entry.onDiscard])
}

export default function SettingsProvider({
  initialUser,
  children,
}: {
  initialUser: UserMe
  children: ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState(initialUser)
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const dirtyRef = useRef<DirtyFormEntry | null>(null)

  const updateUser = useCallback((patch: Partial<UserMe>) => {
    setUser((prev) => ({ ...prev, ...patch }))
  }, [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    setToast({ message, variant })
  }, [])

  const registerDirtyForm = useCallback((entry: DirtyFormEntry | null) => {
    dirtyRef.current = entry
  }, [])

  const guardedNavigate = useCallback(
    (href: string) => {
      if (dirtyRef.current?.dirty) {
        setPendingHref(href)
        return
      }
      router.push(href as Parameters<typeof router.push>[0])
    },
    [router],
  )

  // Browser-level leave guard (tab close / refresh / typed URL).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current?.dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ user, updateUser, showToast, registerDirtyForm, guardedNavigate }),
    [user, updateUser, showToast, registerDirtyForm, guardedNavigate],
  )

  const handleStay = () => setPendingHref(null)

  const handleDontSave = () => {
    dirtyRef.current?.onDiscard()
    const href = pendingHref
    setPendingHref(null)
    if (href) router.push(href as Parameters<typeof router.push>[0])
  }

  const handleSaveAndLeave = async () => {
    const entry = dirtyRef.current
    const href = pendingHref
    const ok = (await entry?.onSave()) ?? false
    setPendingHref(null)
    if (ok && href) router.push(href as Parameters<typeof router.push>[0])
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
      {pendingHref !== null && (
        <UnsavedChangesModal
          onStay={handleStay}
          onDontSave={handleDontSave}
          onSave={() => void handleSaveAndLeave()}
        />
      )}
      {toast && (
        <SettingsToast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </SettingsContext.Provider>
  )
}
