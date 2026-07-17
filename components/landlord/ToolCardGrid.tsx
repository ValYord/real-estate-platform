import ToolCard from './ToolCard'
import { LANDLORD_TOOLS } from '@/lib/landlord/tools'

/** The hub's 5-card tool grid (§2 "TOOL CARDS GRID (grid-cols-3 gap-4)", §6 responsive breakpoints). */
export default function ToolCardGrid() {
  return (
    <div
      role="list"
      aria-label="Landlord tools"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {LANDLORD_TOOLS.map((tool) => (
        <div role="listitem" key={tool.id}>
          <ToolCard tool={tool} />
        </div>
      ))}
    </div>
  )
}
