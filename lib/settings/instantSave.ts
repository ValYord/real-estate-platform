/**
 * Optimistic instant-save orchestration shared by the Preferences,
 * Notifications, and Privacy tabs (§3.1 "Toggle/select → instant save").
 *
 * The caller applies `next` to its local state immediately (optimistic UI),
 * then calls this function; on failure the caller should reset its state to
 * the returned `value` (which is `previous` again — a rollback).
 */
export async function performInstantSave<T>(opts: {
  previous: T
  next: T
  request: () => Promise<Response>
}): Promise<{ ok: boolean; value: T }> {
  try {
    const res = await opts.request()
    if (!res.ok) {
      return { ok: false, value: opts.previous }
    }
    return { ok: true, value: opts.next }
  } catch {
    return { ok: false, value: opts.previous }
  }
}
