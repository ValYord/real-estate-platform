// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Card, { CardHeader, CardBody, CardFooter } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'

afterEach(cleanup)

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Hello</Card>)
    expect(screen.getByText('Hello')).toBeDefined()
  })

  it('applies interactive variant classes', () => {
    render(<Card variant="interactive">Content</Card>)
    expect(screen.getByText('Content').className).toContain('hover:shadow-md')
  })

  it('renders default base classes', () => {
    render(<Card>Content</Card>)
    const el = screen.getByText('Content')
    expect(el.className).toContain('rounded-lg')
    expect(el.className).toContain('bg-surface')
  })

  it('renders CardHeader, CardBody, CardFooter with children', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>,
    )
    expect(screen.getByText('Header')).toBeDefined()
    expect(screen.getByText('Body')).toBeDefined()
    expect(screen.getByText('Footer')).toBeDefined()
    expect(screen.getByText('Header').className).toContain('border-b')
    expect(screen.getByText('Footer').className).toContain('border-t')
  })
})

describe('Badge', () => {
  it('renders its text', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeDefined()
  })

  it('applies the success variant classes', () => {
    render(<Badge variant="success">Active</Badge>)
    expect(screen.getByText('Active').className).toContain('bg-success/15')
  })

  it('defaults to the neutral variant', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default').className).toContain('bg-neutral-100')
  })
})

describe('Skeleton', () => {
  it('applies the animate-pulse base class', () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton').className).toContain('animate-pulse')
  })

  it('merges an incoming className', () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-20" />)
    const el = screen.getByTestId('skeleton')
    expect(el.className).toContain('h-4')
    expect(el.className).toContain('w-20')
  })
})
