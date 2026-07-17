import { Link } from '@/i18n/navigation'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import type { AreaDefinition } from '@/lib/market/areaRegistry'

interface NearbyNeighborhoodsProps {
  areas: AreaDefinition[]
}

/** Internal-linking cluster to adjacent neighborhoods (product doc §3.9 — topical-authority SEO). */
export default function NearbyNeighborhoods({ areas }: NearbyNeighborhoodsProps) {
  if (areas.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">Nearby neighborhoods</h2>
      </CardHeader>
      <CardBody>
        <ul className="space-y-2">
          {areas.map((area) => (
            <li key={area.slug}>
              <Link
                href={`/neighborhood/${area.slug}`}
                className="text-primary hover:underline text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              >
                {area.name}
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
