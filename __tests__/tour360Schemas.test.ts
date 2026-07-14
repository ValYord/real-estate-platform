/**
 * Page 26 — 360° Virtual Tour Viewer (Part A).
 * Unit tests for lib/tour360/schemas.ts — the zod validation that gates
 * whether the viewer renders a tour or a "This tour couldn't be loaded"
 * fallback (CLAUDE.md: validate the tour_data jsonb shape with zod wherever
 * it's read/written).
 */
import { describe, it, expect } from 'vitest'
import {
  tourTypeSchema,
  panoramaTourDataSchema,
  embedTourDataSchema,
  videoTourDataSchema,
  parseTourData,
} from '../lib/tour360/schemas'

describe('tourTypeSchema', () => {
  it('accepts the three known tour types', () => {
    expect(tourTypeSchema.safeParse('panorama').success).toBe(true)
    expect(tourTypeSchema.safeParse('embed_url').success).toBe(true)
    expect(tourTypeSchema.safeParse('video').success).toBe(true)
  })

  it('rejects unknown types and null', () => {
    expect(tourTypeSchema.safeParse('hotspot_graph').success).toBe(false)
    expect(tourTypeSchema.safeParse(null).success).toBe(false)
    expect(tourTypeSchema.safeParse(undefined).success).toBe(false)
  })
})

describe('panoramaTourDataSchema', () => {
  it('accepts one or more valid image URLs', () => {
    const result = panoramaTourDataSchema.safeParse({
      panoramaUrls: ['https://cdn.example.com/pano-living.jpg'],
      sizeMB: 8,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty panoramaUrls array', () => {
    expect(panoramaTourDataSchema.safeParse({ panoramaUrls: [] }).success).toBe(false)
  })

  it('rejects non-URL strings in panoramaUrls', () => {
    expect(panoramaTourDataSchema.safeParse({ panoramaUrls: ['not-a-url'] }).success).toBe(false)
  })

  it('sizeMB is optional', () => {
    const result = panoramaTourDataSchema.safeParse({
      panoramaUrls: ['https://cdn.example.com/pano.jpg'],
    })
    expect(result.success).toBe(true)
  })
})

describe('embedTourDataSchema', () => {
  it('accepts a valid embed URL', () => {
    expect(
      embedTourDataSchema.safeParse({ embedUrl: 'https://my.matterport.com/show/?m=ABC123' })
        .success,
    ).toBe(true)
  })

  it('rejects a missing/invalid URL', () => {
    expect(embedTourDataSchema.safeParse({ embedUrl: 'not-a-url' }).success).toBe(false)
    expect(embedTourDataSchema.safeParse({}).success).toBe(false)
  })
})

describe('videoTourDataSchema', () => {
  it('accepts a valid video URL', () => {
    expect(videoTourDataSchema.safeParse({ videoUrl: 'https://cdn.example.com/tour.mp4' }).success).toBe(
      true,
    )
  })

  it('rejects a missing/invalid URL', () => {
    expect(videoTourDataSchema.safeParse({ videoUrl: '' }).success).toBe(false)
  })
})

describe('parseTourData — never throws, fails safe on malformed data', () => {
  it('parses a valid panorama tour', () => {
    const result = parseTourData('panorama', { panoramaUrls: ['https://cdn.example.com/a.jpg'] })
    expect(result).toEqual({
      type: 'panorama',
      data: { panoramaUrls: ['https://cdn.example.com/a.jpg'] },
    })
  })

  it('parses a valid embed tour', () => {
    const result = parseTourData('embed_url', { embedUrl: 'https://kuula.co/share/abc' })
    expect(result?.type).toBe('embed_url')
  })

  it('parses a valid video tour', () => {
    const result = parseTourData('video', { videoUrl: 'https://cdn.example.com/tour.mp4' })
    expect(result?.type).toBe('video')
  })

  it('returns null for an unknown tour_type', () => {
    expect(parseTourData('hotspot_graph', { anything: true })).toBeNull()
  })

  it('returns null for null tour_type / tour_data (no tour)', () => {
    expect(parseTourData(null, null)).toBeNull()
    expect(parseTourData('panorama', null)).toBeNull()
  })

  it('returns null (not a throw) when tour_data does not match tour_type — e.g. embed shape stored under "panorama"', () => {
    expect(() => parseTourData('panorama', { embedUrl: 'https://kuula.co/share/abc' })).not.toThrow()
    expect(parseTourData('panorama', { embedUrl: 'https://kuula.co/share/abc' })).toBeNull()
  })

  it('returns null for a garbage tour_data payload', () => {
    expect(parseTourData('video', { foo: 'bar' })).toBeNull()
    expect(parseTourData('embed_url', 'just a string')).toBeNull()
    expect(parseTourData('panorama', 42)).toBeNull()
  })
})
