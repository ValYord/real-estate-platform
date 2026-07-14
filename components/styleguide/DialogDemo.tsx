'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog, { DialogBody, DialogTitle } from '@/components/ui/Dialog'

/** Interactive demo of the Dialog primitive, toggled by a Button. Isolated as its own
 * client component so the rest of the styleguide page can stay a Server Component. */
export default function DialogDemo() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle>Confirm action</DialogTitle>
        <DialogBody>
          <p className="text-sm text-muted">
            This is a controlled modal dialog rendered via a portal. Press Escape, click the
            overlay, or use the buttons below to close it.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </div>
  )
}
