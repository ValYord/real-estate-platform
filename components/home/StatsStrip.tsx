import FadeIn from '@/components/motion/FadeIn'

type Stat = { value: string; label: string }

const STATS: Stat[] = [
  { value: '10,000+', label: 'Active listings' },
  { value: '500+', label: 'Verified agents' },
  { value: '3', label: 'Countries covered' },
  { value: '25,000+', label: 'Happy buyers & renters' },
]

/** Homepage section — trust-building numbers between the categories and agent CTA. */
export default function StatsStrip() {
  return (
    <section aria-label="Platform statistics" className="max-w-7xl mx-auto px-4 py-12">
      <FadeIn>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}
