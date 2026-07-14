import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
const css = readFileSync('app/globals.css', 'utf8')
describe('design tokens', () => {
  it.each([
    '--color-primary', '--color-accent', '--color-surface', '--color-border',
    '--color-muted', '--color-success', '--color-warning', '--color-danger',
    '--radius-md', '--shadow-md', '--ease-standard', '--duration-base',
  ])('defines %s', (token) => { expect(css).toContain(token) })
})
