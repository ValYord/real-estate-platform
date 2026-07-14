import type { GuideBlock } from '@/lib/guides/types'
import { InfoBox } from './InfoBox'
import { WarningBox } from './WarningBox'
import { ToolCtaButton } from './ToolCtaButton'

interface GuideBodyProps {
  blocks: GuideBlock[]
}

/**
 * Maps the guide's typed block array to plain JSX, one element per `kind`.
 * No `dangerouslySetInnerHTML` anywhere — content is structured data, not
 * raw/rich HTML (see 0011_guides.sql's header comment), so there is no XSS
 * surface to sanitize.
 */
export function GuideBody({ blocks }: GuideBodyProps) {
  return (
    <div className="max-w-[760px] mt-6 space-y-4">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'heading':
            return block.level === 2 ? (
              <h2 key={block.id} id={block.id} className="text-2xl font-semibold scroll-mt-24 mt-8">
                {block.text}
              </h2>
            ) : (
              <h3 key={block.id} id={block.id} className="text-lg font-semibold scroll-mt-24 mt-6">
                {block.text}
              </h3>
            )
          case 'paragraph':
            return (
              <p key={i} className="text-base text-gray-700 leading-relaxed">
                {block.text}
              </p>
            )
          case 'list':
            return (
              <ul key={i} className="list-disc pl-5 space-y-1 text-gray-700">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )
          case 'info':
            return <InfoBox key={i} text={block.text} />
          case 'warning':
            return <WarningBox key={i} text={block.text} />
          case 'tool_cta':
            return <ToolCtaButton key={i} tool={block.tool} label={block.label} />
          default:
            return null
        }
      })}
    </div>
  )
}
