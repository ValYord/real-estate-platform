/**
 * Pure helper functions for Page 27 — Schedule a Tour (MVP).
 *
 * Kept side-effect-free (no fetch/DOM/Supabase) so they can be unit tested
 * directly and reused by the client modal — one source of truth for the
 * date-strip generation, the fixed time-slot grid, and the ISO datetime
 * builder. See docs/design/27-schedule-tour-handoff.md §4.2/§4.3/§7.
 */

import { MIN_LEAD_MS } from './schemas'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Fixed hourly grid, 09:00–19:00 (11 slots), same for every day — no owner availability engine in MVP (handoff §1 C2). */
const TIME_SLOT_HOURS = Array.from({ length: 11 }, (_, i) => 9 + i) // 9..19

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Formats a Date's local calendar date as `YYYY-MM-DD`. */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export interface DateOption {
  date: string
  label: string
}

/**
 * Generates `days` consecutive date options starting today (local time).
 * No disabled/greyed days in MVP — there is no owner working-days
 * configuration to check against (handoff §4.2).
 */
export function buildDateOptions(now: Date, days = 14): DateOption[] {
  const options: DateOption[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    options.push({
      date: toDateKey(d),
      label: `${WEEKDAY_LABELS[d.getDay()]} ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`,
    })
  }
  return options
}

export interface TimeSlotOption {
  time: string
  disabled: boolean
}

/**
 * Fixed hourly time-slot grid (09:00–19:00) for `selectedDate`. The only
 * "availability" logic in MVP: a slot on *today* that falls before
 * `now + MIN_LEAD_MS` is disabled, satisfying the min-lead-time rule the API
 * also enforces (schemas.ts). Slots on future dates are never disabled —
 * there is no busy/free data source in MVP (handoff §4.3).
 */
export function buildTimeSlots(selectedDate: string, now: Date): TimeSlotOption[] {
  const isToday = selectedDate === toDateKey(now)
  const minBookable = now.getTime() + MIN_LEAD_MS

  return TIME_SLOT_HOURS.map((hour) => {
    const time = `${pad2(hour)}:00`
    let disabled = false
    if (isToday) {
      const [year, month, day] = selectedDate.split('-').map(Number)
      const slotDate = new Date(year, month - 1, day, hour, 0, 0, 0)
      disabled = slotDate.getTime() < minBookable
    }
    return { time, disabled }
  })
}

/**
 * Combines a `YYYY-MM-DD` date and `HH:MM` time (interpreted in the calling
 * environment's local offset) into an ISO-8601 datetime string suitable for
 * `tourRequestSchema.requestedAt`.
 */
export function buildRequestedAtIso(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString()
}
