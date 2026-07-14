/**
 * Page 26 — 360° Virtual Tour Viewer (Part A).
 *
 * Small, unit-testable feature-detection helpers for the panorama viewer's
 * graceful-degradation states (see docs/design/26-virtual-tour-viewer-handoff.md
 * §3.9 "WebGL-unavailable fallback" and §3.6 "Gyroscope prompt"). Kept out of
 * the viewer component itself so they can be tested without mounting
 * three.js or touching the DOM.
 */

/**
 * Whether the browser can create a WebGL rendering context. When it can't,
 * the viewer must skip mounting the panorama library entirely and render a
 * static wide image instead (no interactive controls in that state).
 */
export function supportsWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return gl != null
  } catch {
    return false
  }
}

/**
 * Whether the `DeviceOrientationEvent` API exists at all. Used to decide
 * whether to show the mobile gyroscope prompt banner — per the doc, when
 * it's unavailable the banner (and any gyro control) is simply omitted, not
 * shown disabled; drag/swipe navigation keeps working either way.
 */
export function supportsDeviceOrientation(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

/**
 * iOS 13+ gates DeviceOrientationEvent behind an explicit permission prompt
 * (`DeviceOrientationEvent.requestPermission()`), which no other platform
 * exposes. Callers should only invoke the request when this is true.
 */
export function needsDeviceOrientationPermission(): boolean {
  if (!supportsDeviceOrientation()) return false
  const DOE = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>
  }
  return typeof DOE.requestPermission === 'function'
}

/**
 * `prefers-reduced-motion: reduce` — when set, the panorama viewer must
 * never start its subtle auto-rotate.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
