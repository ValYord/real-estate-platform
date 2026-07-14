/**
 * Page 26 — 360° Virtual Tour Viewer (Part A).
 * Unit tests for lib/tour360/featureDetect.ts — the graceful-degradation
 * checks (WebGL-unavailable → static image fallback; no DeviceOrientationEvent
 * → omit the gyroscope prompt) called out by the acceptance criteria as
 * verifiable "via feature-detection code review/unit test, not necessarily a
 * real device".
 *
 * vitest runs in a `node` environment here (see vitest.config.ts) — there is
 * no `document`/`window` by default, which is itself the "no WebGL / no
 * DeviceOrientationEvent" case these helpers must degrade for. Browser-like
 * globals are stubbed per-test with `vi.stubGlobal` to exercise the
 * "supported" branches.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  supportsWebGL,
  supportsDeviceOrientation,
  needsDeviceOrientationPermission,
  prefersReducedMotion,
} from '../lib/tour360/featureDetect'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('supportsWebGL', () => {
  it('returns false when `document` does not exist (SSR / no browser)', () => {
    expect(supportsWebGL()).toBe(false)
  })

  it('returns true when canvas.getContext returns a WebGL context', () => {
    vi.stubGlobal('document', {
      createElement: () => ({
        getContext: (type: string) => (type === 'webgl2' ? { fake: 'gl' } : null),
      }),
    })
    expect(supportsWebGL()).toBe(true)
  })

  it('returns false when canvas.getContext returns null for both webgl2 and webgl', () => {
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: () => null }),
    })
    expect(supportsWebGL()).toBe(false)
  })

  it('returns false (never throws) when canvas creation itself throws', () => {
    vi.stubGlobal('document', {
      createElement: () => {
        throw new Error('no canvas support')
      },
    })
    expect(() => supportsWebGL()).not.toThrow()
    expect(supportsWebGL()).toBe(false)
  })
})

describe('supportsDeviceOrientation', () => {
  it('returns false when `window` does not exist', () => {
    expect(supportsDeviceOrientation()).toBe(false)
  })

  it('returns true when window.DeviceOrientationEvent exists', () => {
    vi.stubGlobal('window', { DeviceOrientationEvent: function () {} })
    expect(supportsDeviceOrientation()).toBe(true)
  })

  it('returns false when window exists but has no DeviceOrientationEvent (most Android/desktop browsers)', () => {
    vi.stubGlobal('window', {})
    expect(supportsDeviceOrientation()).toBe(false)
  })
})

describe('needsDeviceOrientationPermission (iOS 13+ gate)', () => {
  it('returns false when DeviceOrientationEvent is unsupported', () => {
    expect(needsDeviceOrientationPermission()).toBe(false)
  })

  it('returns false when DeviceOrientationEvent exists but has no requestPermission (Android)', () => {
    vi.stubGlobal('window', { DeviceOrientationEvent: function () {} })
    expect(needsDeviceOrientationPermission()).toBe(false)
  })

  it('returns true when DeviceOrientationEvent.requestPermission exists (iOS 13+)', () => {
    vi.stubGlobal('window', {
      DeviceOrientationEvent: Object.assign(function () {}, {
        requestPermission: () => Promise.resolve('granted'),
      }),
    })
    expect(needsDeviceOrientationPermission()).toBe(true)
  })
})

describe('prefersReducedMotion', () => {
  it('returns false when `window` does not exist', () => {
    expect(prefersReducedMotion()).toBe(false)
  })

  it('returns true when matchMedia reports prefers-reduced-motion: reduce', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({ matches: query.includes('reduce') }),
    })
    expect(prefersReducedMotion()).toBe(true)
  })

  it('returns false when matchMedia reports no preference', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
    })
    expect(prefersReducedMotion()).toBe(false)
  })
})
