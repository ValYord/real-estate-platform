// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import FadeIn from '../components/motion/FadeIn'

// jsdom has no IntersectionObserver; framer-motion's `whileInView` needs one.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

afterEach(cleanup)

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce, media: q, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
}

describe('motion primitives — reduced motion', () => {
  it('FadeIn renders children plainly (no opacity:0) under reduced motion', () => {
    mockReducedMotion(true)
    render(<FadeIn><p>hello</p></FadeIn>)
    const el = screen.getByText('hello').parentElement as HTMLElement
    expect(el.style.opacity === '' || el.style.opacity === '1').toBe(true)
  })
  it('FadeIn still renders its children when motion is allowed', () => {
    mockReducedMotion(false)
    render(<FadeIn><p>world</p></FadeIn>)
    expect(screen.getByText('world')).toBeDefined()
  })
})
