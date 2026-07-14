/**
 * Page 26 — 360° Virtual Tour Viewer (Part A).
 * Unit tests for lib/property/tabs.ts's `getVisibleMediaTabs`, which
 * implements D1 from docs/design/26-virtual-tour-viewer-handoff.md: the
 * [🌐 360°] tab must be omitted from the DOM entirely when there's no tour
 * (not merely rendered disabled), while video/floorplan keep their existing
 * disabled-grey treatment.
 */
import { describe, it, expect } from 'vitest'
import { getVisibleMediaTabs, ALL_MEDIA_TABS } from '../lib/property/tabs'

describe('getVisibleMediaTabs', () => {
  it('omits the tour360 tab entirely when there is no tour', () => {
    const tabs = getVisibleMediaTabs({ hasVideo: true, hasTour360: false, hasFloorplan: true })
    expect(tabs.some((t) => t.key === 'tour360')).toBe(false)
  })

  it('includes the tour360 tab when a tour exists', () => {
    const tabs = getVisibleMediaTabs({ hasVideo: false, hasTour360: true, hasFloorplan: false })
    expect(tabs.some((t) => t.key === 'tour360')).toBe(true)
  })

  it('always keeps photo, video, map, floorplan regardless of tour availability', () => {
    const withoutTour = getVisibleMediaTabs({ hasVideo: false, hasTour360: false, hasFloorplan: false })
    expect(withoutTour.map((t) => t.key)).toEqual(['photo', 'video', 'map', 'floorplan'])
  })

  it('never adds tabs beyond the known set', () => {
    const tabs = getVisibleMediaTabs({ hasVideo: true, hasTour360: true, hasFloorplan: true })
    expect(tabs).toHaveLength(ALL_MEDIA_TABS.length)
  })
})
