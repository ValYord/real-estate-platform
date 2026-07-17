import { Building2, Home as HomeIcon, Building, Trees, Warehouse } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import Card from '@/components/ui/Card'
import Stagger from '@/components/motion/Stagger'
import FadeIn from '@/components/motion/FadeIn'

type CategoryItem = {
  label: string
  description: string
  href: string
  icon: typeof Building2
}

const CATEGORIES: CategoryItem[] = [
  {
    label: 'Apartments',
    description: 'Flats & condos',
    href: '/search?type=apartment',
    icon: Building2,
  },
  {
    label: 'Houses',
    description: 'Detached homes',
    href: '/search?type=house',
    icon: HomeIcon,
  },
  {
    label: 'New construction',
    description: 'Fresh developments',
    href: '/search?type=new_construction',
    icon: Building,
  },
  {
    label: 'Land',
    description: 'Plots & lots',
    href: '/search?type=land',
    icon: Trees,
  },
  {
    label: 'Commercial',
    description: 'Offices & retail',
    href: '/search?type=commercial',
    icon: Warehouse,
  },
]

/** Homepage section — property-type shortcuts leading into filtered search. */
export default function Categories() {
  return (
    <section aria-labelledby="categories-heading" className="max-w-7xl mx-auto px-4 py-12">
      <FadeIn>
        <h2 id="categories-heading" className="text-2xl font-semibold text-text mb-6">
          Browse by property type
        </h2>
      </FadeIn>

      <Stagger className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <Link key={category.href} href={category.href} className="block h-full">
              <Card
                variant="interactive"
                className="p-5 h-full hover:border-primary focus-within:ring-2 focus-within:ring-primary"
              >
                <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
                <p className="mt-3 font-semibold text-text">{category.label}</p>
                <p className="text-sm text-muted mt-0.5">{category.description}</p>
              </Card>
            </Link>
          )
        })}
      </Stagger>
    </section>
  )
}
