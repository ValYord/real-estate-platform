import { AlertTriangle } from 'lucide-react'

interface WarningBoxProps {
  text: string
}

/** ⚠ caution callout. `role="note"` + a visible icon — never color alone conveys meaning. */
export function WarningBox({ text }: WarningBoxProps) {
  return (
    <div
      role="note"
      className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg flex gap-2 items-start text-sm text-amber-900"
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p>{text}</p>
    </div>
  )
}
