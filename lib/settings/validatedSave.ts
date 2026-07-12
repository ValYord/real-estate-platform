import type { FieldValues, UseFormHandleSubmit } from 'react-hook-form'

/**
 * Bridges React Hook Form's `handleSubmit` to the leave-guard's `onSave`, which must
 * report whether the save actually succeeded so `SettingsContext.handleSaveAndLeave`
 * only navigates away on success.
 *
 * `handleSubmit(onValid)()` resolves to `void` (React Hook Form discards `onValid`'s
 * return value) and does not reject on HTTP-level failures — our `submit` handlers
 * return `false` for a rejected server response (401/409/422/500) rather than throwing.
 * So the success boolean must be captured in a closure rather than derived from the
 * promise settling. When client-side validation fails, `onValid` is never invoked and
 * `ok` correctly stays `false`.
 */
export function runValidatedSave<TData extends FieldValues>(
  handleSubmit: UseFormHandleSubmit<TData>,
  submit: (data: TData) => Promise<boolean>,
): () => Promise<boolean> {
  return async () => {
    let ok = false
    await handleSubmit(async (data) => {
      ok = await submit(data)
    })()
    return ok
  }
}
