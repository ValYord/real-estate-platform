/**
 * Tests for the pure helpers in lib/tours/helpers.ts — the date-strip
 * generator, the fixed hourly time-slot grid, and the ISO datetime builder.
 * docs/design/27-schedule-tour-handoff.md §4.2/§4.3/§12.
 */
import { describe, it, expect } from 'vitest'
import { buildDateOptions, buildTimeSlots, buildRequestedAtIso } from '../lib/tours/helpers'
import { MIN_LEAD_MS } from '../lib/tours/schemas'

describe('buildDateOptions', () => {
  it('returns exactly `days` entries starting at now’s date', () => {
    const now = new Date(2026, 6, 12, 10, 0, 0) // Sun Jul 12, 2026, local time
    const options = buildDateOptions(now, 14)
    expect(options).toHaveLength(14)
    expect(options[0].date).toBe('2026-07-12')
    expect(options[13].date).toBe('2026-07-25')
  })

  it('defaults to 14 days when `days` is omitted', () => {
    const now = new Date(2026, 6, 12)
    expect(buildDateOptions(now)).toHaveLength(14)
  })

  it('produces consecutive calendar dates with no gaps', () => {
    const now = new Date(2026, 6, 30) // near month boundary
    const options = buildDateOptions(now, 5)
    expect(options.map((o) => o.date)).toEqual([
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ])
  })

  it('each option has a non-empty human-readable label', () => {
    const now = new Date(2026, 6, 12)
    const options = buildDateOptions(now, 3)
    for (const opt of options) {
      expect(opt.label.length).toBeGreaterThan(0)
    }
  })
})

describe('buildTimeSlots', () => {
  it('returns the fixed 09:00–19:00 hourly grid (11 slots)', () => {
    const now = new Date(2026, 6, 12, 6, 0, 0) // well before the grid starts
    const slots = buildTimeSlots('2026-07-12', now)
    expect(slots).toHaveLength(11)
    expect(slots[0].time).toBe('09:00')
    expect(slots[10].time).toBe('19:00')
  })

  it('marks pre-lead-time slots as disabled only when selectedDate is today', () => {
    // "Now" is 12:30 on Jul 12 — 09:00/10:00/11:00/12:00 are all in the past
    // or within MIN_LEAD_MS, 13:00+ should be bookable.
    const now = new Date(2026, 6, 12, 12, 30, 0)
    const slots = buildTimeSlots('2026-07-12', now)
    const bySlot = new Map(slots.map((s) => [s.time, s.disabled]))
    expect(bySlot.get('09:00')).toBe(true)
    expect(bySlot.get('12:00')).toBe(true)
    expect(bySlot.get('14:00')).toBe(false)
  })

  it('never disables slots on a future date, regardless of the current time', () => {
    const now = new Date(2026, 6, 12, 20, 0, 0) // late in the day
    const slots = buildTimeSlots('2026-07-13', now)
    expect(slots.every((s) => !s.disabled)).toBe(true)
  })

  it('respects MIN_LEAD_MS at the boundary', () => {
    // now = 08:30, MIN_LEAD_MS = 1h -> earliest bookable instant is 09:30.
    // The 09:00 slot (09:00 < 09:30) must be disabled; 10:00 must not.
    const now = new Date(2026, 6, 12, 8, 30, 0)
    expect(now.getTime() + MIN_LEAD_MS).toBe(new Date(2026, 6, 12, 9, 30, 0).getTime())
    const slots = buildTimeSlots('2026-07-12', now)
    const bySlot = new Map(slots.map((s) => [s.time, s.disabled]))
    expect(bySlot.get('09:00')).toBe(true)
    expect(bySlot.get('10:00')).toBe(false)
  })
})

describe('buildRequestedAtIso', () => {
  it('round-trips through new Date(...) back to the same date/time components', () => {
    const iso = buildRequestedAtIso('2026-07-15', '14:00')
    const parsed = new Date(iso)
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(6) // July = index 6
    expect(parsed.getDate()).toBe(15)
    expect(parsed.getHours()).toBe(14)
    expect(parsed.getMinutes()).toBe(0)
  })

  it('produces a valid ISO-8601 datetime string', () => {
    const iso = buildRequestedAtIso('2026-07-15', '09:00')
    expect(() => new Date(iso).toISOString()).not.toThrow()
    expect(Number.isNaN(new Date(iso).getTime())).toBe(false)
  })
})
