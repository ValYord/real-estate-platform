import { describe, it, expect } from 'vitest'
import { cn } from '../components/ui/variants'

describe('cn', () => {
  it('merges class names and de-dupes conflicting tailwind utilities', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', false && 'hidden', 'font-medium')).toBe('text-sm font-medium')
  })
})
