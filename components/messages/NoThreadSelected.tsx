import { MessageSquare } from 'lucide-react'

/**
 * Desktop-only placeholder shown in the right pane when the list has
 * conversations but none is selected yet. Hidden on mobile by MessagesShell.
 */
export default function NoThreadSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
      <MessageSquare className="w-10 h-10 text-gray-300" aria-hidden="true" />
      <p className="text-sm text-gray-500">Select a conversation on the left</p>
    </div>
  )
}
