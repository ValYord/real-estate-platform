import { Building2, BedDouble, Bath, Maximize2, MapPin } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import Card, { CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Stagger from '@/components/motion/Stagger'
import FadeIn from '@/components/motion/FadeIn'

type FeaturedListing = {
  id: string
  title: string
  price: string
  location: string
  bedrooms: number
  bathrooms: number
  area: number
  deal: 'sale' | 'rent'
  href: string
}

const FEATURED: FeaturedListing[] = [
  {
    id: '1',
    title: '2-room apartment, Arabkir',
    price: '52M AMD',
    location: 'Arabkir, Yerevan',
    bedrooms: 2,
    bathrooms: 1,
    area: 75,
    deal: 'sale',
    href: '/search?deal=sale&district=Arabkir',
  },
  {
    id: '2',
    title: 'Modern studio, Kentron',
    price: '320K AMD/mo',
    location: 'Kentron, Yerevan',
    bedrooms: 1,
    bathrooms: 1,
    area: 42,
    deal: 'rent',
    href: '/search?deal=rent&district=Kentron',
  },
  {
    id: '3',
    title: 'Family house with garden',
    price: '98M AMD',
    location: 'Ashtarak',
    bedrooms: 4,
    bathrooms: 2,
    area: 180,
    deal: 'sale',
    href: '/search?deal=sale&city=Ashtarak',
  },
  {
    id: '4',
    title: 'New-build 3-room flat',
    price: '76M AMD',
    location: 'Davtashen, Yerevan',
    bedrooms: 3,
    bathrooms: 2,
    area: 105,
    deal: 'sale',
    href: '/search?deal=sale&type=new_construction',
  },
]

/** Homepage section — a curated sample of listings to demonstrate what's on the platform. */
export default function FeaturedListings() {
  return (
    <section aria-labelledby="featured-heading" className="bg-neutral-50 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <FadeIn>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 id="featured-heading" className="text-2xl font-semibold text-text">
                Featured properties
              </h2>
              <p className="text-sm text-muted mt-1">A sample of listings live on the platform</p>
            </div>
            <Link
              href="/search"
              className="hidden sm:inline text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              See all &rarr;
            </Link>
          </div>
        </FadeIn>

        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURED.map((listing) => (
            <Link key={listing.id} href={listing.href} className="block h-full">
              <Card variant="interactive" className="h-full overflow-hidden">
                <div className="relative h-36 bg-neutral-100 flex items-center justify-center">
                  <Building2 className="w-9 h-9 text-neutral-300" aria-hidden="true" />
                  <Badge variant="accent" className="absolute top-2 left-2">
                    Featured
                  </Badge>
                </div>
                <CardBody className="p-4">
                  <p className="text-base font-bold text-text">{listing.price}</p>
                  <p className="text-sm text-muted mt-0.5 truncate">{listing.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                      {listing.bedrooms}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5" aria-hidden="true" />
                      {listing.bathrooms}
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                      {listing.area} m&sup2;
                    </span>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted mt-2">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    {listing.location}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </Stagger>

        <Link
          href="/search"
          className="sm:hidden mt-6 inline-block text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          See all &rarr;
        </Link>
      </div>
    </section>
  )
}
