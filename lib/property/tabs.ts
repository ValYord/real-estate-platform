/**
 * Pure helper for PropertyGallery's media tab bar — extracted so the
 * "360° tab is omitted entirely when there's no tour, not merely disabled"
 * rule (docs/design/26-virtual-tour-viewer-handoff.md D1) is unit-testable
 * without rendering the component.
 */

export type MediaTab = 'photo' | 'video' | 'tour360' | 'map' | 'floorplan'

export interface MediaTabDef {
  key: MediaTab
  label: string
}

export interface MediaTabAvailability {
  hasVideo: boolean
  hasTour360: boolean
  hasFloorplan: boolean
}

export const ALL_MEDIA_TABS: MediaTabDef[] = [
  { key: 'photo', label: 'Photos' },
  { key: 'video', label: 'Video' },
  { key: 'tour360', label: '360°' },
  { key: 'map', label: 'Map' },
  { key: 'floorplan', label: 'Floor plan' },
]

/**
 * Returns the tabs that should actually render in the DOM.
 *
 * The 360° tab is *filtered out* (not rendered, not disabled) when there's
 * no tour — per doc §3.9 "the tab is not shown at all... no empty tab".
 * `video`/`floorplan` keep the existing disabled-grey treatment (out of
 * scope for this task) — the caller still needs to know whether to render
 * them disabled, so this only removes tour360, never the other two.
 */
export function getVisibleMediaTabs(
  availability: MediaTabAvailability,
  tabs: MediaTabDef[] = ALL_MEDIA_TABS,
): MediaTabDef[] {
  return tabs.filter((tab) => tab.key !== 'tour360' || availability.hasTour360)
}
