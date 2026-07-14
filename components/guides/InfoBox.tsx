import { Info } from 'lucide-react'

interface InfoBoxProps {
  text: string
}

/** 💡 tip callout. `role="note"` + a visible icon — never color alone conveys meaning. */
export function InfoBox({ text }: InfoBoxProps) {
  return (
    <div
      role="note"
      className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg flex gap-2 items-start text-sm text-blue-900"
    >
      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p>{text}</p>
    </div>
  )
}
