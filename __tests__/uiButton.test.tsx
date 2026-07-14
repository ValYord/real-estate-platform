// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Button from '../components/ui/Button'

afterEach(cleanup)

describe('Button', () => {
  it('renders its children as a button', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined()
  })
  it('applies the destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button').className).toContain('bg-danger')
  })
  it('is disabled and shows a busy state when loading', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
  })
})
