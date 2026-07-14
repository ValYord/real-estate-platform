// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import Dialog, { DialogTitle, DialogBody } from '../components/ui/Dialog'
import Tooltip from '../components/ui/Tooltip'

afterEach(cleanup)

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogTitle>Hello</DialogTitle>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the dialog and its children when open', () => {
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogTitle>My Title</DialogTitle>
        <DialogBody>Body content</DialogBody>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('My Title')).toBeDefined()
    expect(screen.getByText('Body content')).toBeDefined()
  })

  it('calls onOpenChange(false) when Escape is pressed', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogTitle>Title</DialogTitle>
      </Dialog>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) when the overlay is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogTitle>Title</DialogTitle>
      </Dialog>,
    )
    const overlay = document.querySelector('[data-dialog-overlay]')
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay as Element)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not close when clicking inside the panel', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogTitle>Title</DialogTitle>
      </Dialog>,
    )
    fireEvent.click(screen.getByRole('dialog'))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('applies the expected panel classes', () => {
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogTitle>Title</DialogTitle>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('rounded-lg')
    expect(dialog.className).toContain('bg-surface')
    expect(dialog.className).toContain('shadow-lg')
    expect(dialog.className).toContain('max-w-lg')
    expect(dialog.className).toContain('w-full')
  })

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogTitle>Title</DialogTitle>
      </Dialog>,
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogTitle>Title</DialogTitle>
      </Dialog>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('wires DialogTitle to the panel via aria-labelledby', () => {
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogTitle>My Title</DialogTitle>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    const title = screen.getByText('My Title')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(title.getAttribute('id')).toBe(labelledBy)
  })
})

function ControlledDialog() {
  const [open, setOpen] = useState(true)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTitle>Title</DialogTitle>
    </Dialog>
  )
}

describe('Dialog (integration)', () => {
  it('closes itself on Escape when wired to state', () => {
    render(<ControlledDialog />)
    expect(screen.getByRole('dialog')).toBeDefined()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Tooltip', () => {
  it('shows the tooltip content on focus and hides it on blur', () => {
    render(
      <Tooltip content="Helpful hint">
        <button>Trigger</button>
      </Tooltip>,
    )
    expect(screen.queryByRole('tooltip')).toBeNull()

    const trigger = screen.getByRole('button', { name: 'Trigger' })
    fireEvent.focus(trigger)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeDefined()
    expect(tooltip.textContent).toBe('Helpful hint')

    fireEvent.blur(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('shows the tooltip content on mouseEnter and hides it on mouseLeave', () => {
    render(
      <Tooltip content="Another hint">
        <button>Hover me</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Hover me' })
    fireEvent.mouseEnter(trigger)
    expect(screen.getByRole('tooltip').textContent).toBe('Another hint')

    fireEvent.mouseLeave(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
