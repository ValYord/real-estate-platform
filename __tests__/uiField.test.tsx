// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

afterEach(cleanup)

describe('Field', () => {
  it('renders a label linked to the control via htmlFor, and renders its children', () => {
    render(
      <Field label="Email" htmlFor="email">
        <input id="email" />
      </Field>,
    )
    const label = screen.getByText('Email')
    expect(label.tagName).toBe('LABEL')
    expect(label.getAttribute('for')).toBe('email')
    expect(document.getElementById('email')).not.toBeNull()
  })

  it('renders the hint when no error is given', () => {
    render(
      <Field label="Email" htmlFor="email" hint="We'll never share your email.">
        <input id="email" />
      </Field>,
    )
    expect(screen.getByText("We'll never share your email.").className).toContain('text-muted')
  })

  it('renders the error with role="alert" when given', () => {
    render(
      <Field label="Email" htmlFor="email" error="Email is required">
        <input id="email" />
      </Field>,
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Email is required')
    expect(alert.className).toContain('text-danger')
  })

  it('shows the error instead of the hint when both are given', () => {
    render(
      <Field label="Email" htmlFor="email" hint="A hint" error="An error">
        <input id="email" />
      </Field>,
    )
    expect(screen.getByRole('alert').textContent).toBe('An error')
    expect(screen.queryByText('A hint')).toBeNull()
  })
})

describe('Input', () => {
  it('forwards the type prop and applies base classes', () => {
    render(<Input type="email" />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.getAttribute('type')).toBe('email')
    expect(input.className).toContain('bg-surface')
  })
})

describe('Select', () => {
  it('renders as a select element containing its option children', () => {
    render(
      <Select>
        <option>A</option>
      </Select>,
    )
    const select = screen.getByRole('combobox')
    expect(select.tagName).toBe('SELECT')
    expect(select.textContent).toContain('A')
  })
})
