/**
 * Regression test for the Settings leave-guard "Save and leave" flow.
 *
 * Bug (PR #13, [critical]): `handleSubmit(submit)().then(() => true).catch(() => false)`
 * always reported success because React Hook Form discards `submit`'s boolean and its
 * returned promise never rejects on an HTTP-level failure — so a user was navigated away
 * (losing edits) even when the server rejected the save. `runValidatedSave` captures the
 * real boolean, so a failed or invalid save reports `false`.
 */
import { describe, it, expect, vi } from 'vitest'
import type { UseFormHandleSubmit } from 'react-hook-form'
import { runValidatedSave } from '../lib/settings/validatedSave'

type Data = { name: string }

/**
 * Minimal stand-in for React Hook Form's `handleSubmit`: when `valid` it invokes the
 * `onValid` callback with `data` (mirroring a passing validation); when invalid it skips
 * `onValid` entirely. In both cases the returned invoker resolves without rejecting.
 */
function fakeHandleSubmit(valid: boolean, data: Data): UseFormHandleSubmit<Data> {
  const handleSubmit = (onValid: (d: Data) => unknown) => async () => {
    if (valid) await onValid(data)
  }
  return handleSubmit as unknown as UseFormHandleSubmit<Data>
}

describe('runValidatedSave', () => {
  it('returns true when the form is valid and submit succeeds', async () => {
    const submit = vi.fn().mockResolvedValue(true)
    const onSave = runValidatedSave(fakeHandleSubmit(true, { name: 'Ann' }), submit)
    expect(await onSave()).toBe(true)
    expect(submit).toHaveBeenCalledWith({ name: 'Ann' })
  })

  it('returns false when submit reports a server-side failure (the bug)', async () => {
    const submit = vi.fn().mockResolvedValue(false)
    const onSave = runValidatedSave(fakeHandleSubmit(true, { name: 'Ann' }), submit)
    expect(await onSave()).toBe(false)
  })

  it('returns false when client-side validation fails (onValid never runs)', async () => {
    const submit = vi.fn().mockResolvedValue(true)
    const onSave = runValidatedSave(fakeHandleSubmit(false, { name: '' }), submit)
    expect(await onSave()).toBe(false)
    expect(submit).not.toHaveBeenCalled()
  })
})
