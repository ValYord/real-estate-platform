import type { CompareProperty } from './types'
import { MIN_COMPARE } from './schemas'

export type CompareViewState = 'empty' | 'under-minimum' | 'ready'

/** Derives which of the three page states to render from the parsed ids. */
export function deriveCompareState(ids: string[]): CompareViewState {
  if (ids.length === 0) return 'empty'
  if (ids.length < MIN_COMPARE) return 'under-minimum'
  return 'ready'
}

/** A CompareProperty is unavailable (sold or hard-deleted) — same UI either way. */
export function isUnavailable(item: CompareProperty): boolean {
  return item.unavailable
}
