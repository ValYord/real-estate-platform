import { Users, ShieldCheck, MessageCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SlideIn from '@/components/motion/SlideIn'

const AGENT_POINTS = [
  { icon: ShieldCheck, text: 'Verified professionals, background-checked' },
  { icon: MessageCircle, text: 'Direct messaging, no middlemen fees' },
]

/**
 * Homepage section — pairs an "agent highlight" panel with the "post a
 * listing" CTA banner (spec doc §3.7/§3.8) side by side on desktop, stacked
 * on mobile, so the two secondary conversion paths (find an agent / list a
 * property) get equal visual weight.
 */
export default function AgentAndCta() {
  return (
    <section className="max-w-7xl mx-auto px-4 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent highlight */}
        <SlideIn direction="left">
          <Card className="h-full">
            <CardBody className="p-8 flex flex-col h-full">
              <Users className="w-10 h-10 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-text mt-4">
                Work with a local expert
              </h2>
              <p className="text-sm text-muted mt-2">
                Our network of verified agents knows every neighborhood. Get personal
                guidance, from first viewing to closing.
              </p>
              <ul className="mt-4 space-y-2">
                {AGENT_POINTS.map((point) => {
                  const Icon = point.icon
                  return (
                    <li key={point.text} className="flex items-center gap-2 text-sm text-text">
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                      {point.text}
                    </li>
                  )
                })}
              </ul>
              <Link href="/agents" className="mt-6 self-start">
                <Button variant="secondary">Find an agent</Button>
              </Link>
            </CardBody>
          </Card>
        </SlideIn>

        {/* Post-listing CTA banner */}
        <SlideIn direction="right">
          <div className="h-full rounded-lg bg-primary text-primary-fg p-8 flex flex-col justify-center shadow-sm">
            <h2 className="text-xl font-semibold">Selling a property?</h2>
            <p className="text-sm text-primary-fg/80 mt-2">
              Post for free in 5 minutes and reach thousands of buyers and renters across
              Armenia.
            </p>
            <Link href="/sell/new" className="mt-6 self-start">
              <Button variant="secondary">Post a property</Button>
            </Link>
          </div>
        </SlideIn>
      </div>
    </section>
  )
}
