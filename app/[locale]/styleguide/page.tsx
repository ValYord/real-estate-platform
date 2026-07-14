import { notFound } from 'next/navigation'

import Section from '@/components/styleguide/Section'
import DialogDemo from '@/components/styleguide/DialogDemo'

import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardFooter, CardHeader } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Tooltip from '@/components/ui/Tooltip'

import FadeIn from '@/components/motion/FadeIn'
import Reveal from '@/components/motion/Reveal'
import SlideIn from '@/components/motion/SlideIn'
import Stagger from '@/components/motion/Stagger'

type PageParams = { locale: string }

const COLOR_SWATCHES = [
  { name: 'Primary', className: 'bg-primary', fg: 'text-primary-fg' },
  { name: 'Accent', className: 'bg-accent', fg: 'text-accent-fg' },
  { name: 'Success', className: 'bg-success', fg: 'text-white' },
  { name: 'Warning', className: 'bg-warning', fg: 'text-white' },
  { name: 'Danger', className: 'bg-danger', fg: 'text-white' },
] as const

const NEUTRAL_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'destructive'] as const
const BUTTON_SIZES = ['sm', 'md', 'lg'] as const

const BADGE_VARIANTS = ['neutral', 'primary', 'accent', 'success', 'warning', 'danger'] as const

const TYPE_SCALE = [
  { label: 'text-xs', className: 'text-xs' },
  { label: 'text-sm', className: 'text-sm' },
  { label: 'text-base', className: 'text-base' },
  { label: 'text-lg', className: 'text-lg' },
  { label: 'text-xl', className: 'text-xl' },
  { label: 'text-2xl', className: 'text-2xl' },
  { label: 'text-3xl', className: 'text-3xl' },
  { label: 'text-5xl (display)', className: 'text-5xl' },
] as const

export default async function StyleguidePage({ params }: { params: Promise<PageParams> }) {
  if (process.env.NODE_ENV === 'production') notFound()

  await params

  return (
    <main className="mx-auto max-w-screen-xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <Badge variant="accent">Dev only</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-text">Styleguide</h1>
        <p className="max-w-2xl text-base text-muted">
          A living reference of the design tokens and UI primitives used across the platform.
          This route is gated to development environments and returns a 404 in production.
        </p>
      </header>

      <Section
        title="Colors"
        description="Brand, semantic, and neutral tokens defined in the @theme block of app/globals.css."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {COLOR_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="space-y-2">
              <div
                className={`flex h-20 items-end rounded-lg p-3 shadow-sm ${swatch.className} ${swatch.fg}`}
              >
                <span className="text-sm font-medium">{swatch.name}</span>
              </div>
              <p className="text-xs text-muted">bg-{swatch.name.toLowerCase()}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text">Neutral scale</h3>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-11">
            {NEUTRAL_STEPS.map((step) => (
              <div key={step} className="space-y-2">
                <div
                  className="h-16 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: `var(--color-neutral-${step})` }}
                />
                <p className="text-center text-xs text-muted">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="Typography"
        description="Tailwind's default type scale, used consistently from small print up to display headings."
      >
        <div className="space-y-4">
          {TYPE_SCALE.map((step) => (
            <div key={step.label} className="flex items-baseline gap-4">
              <span className="w-40 shrink-0 text-xs text-muted">{step.label}</span>
              <span className={`${step.className} font-medium text-text`}>
                The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons" description="All variants at every size, plus a loading state.">
        <div className="space-y-4">
          {BUTTON_VARIANTS.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-muted">{variant}</span>
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {size.toUpperCase()} button
                </Button>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-muted">loading</span>
            <Button loading>Saving…</Button>
            <Button variant="secondary" loading>
              Saving…
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Cards" description="Default and interactive variants, using the header/body/footer slots.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-text">Default card</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted">
                Static content container with a subtle border and shadow-sm.
              </p>
            </CardBody>
            <CardFooter>
              <Button size="sm" variant="secondary">
                Action
              </Button>
            </CardFooter>
          </Card>

          <Card variant="interactive">
            <CardHeader>
              <h3 className="text-base font-semibold text-text">Interactive card</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted">
                Adds a hover shadow transition and a pointer cursor for clickable cards.
              </p>
            </CardBody>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Badges" description="Every semantic badge variant.">
        <div className="flex flex-wrap gap-3">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </Section>

      <Section
        title="Form fields"
        description="Field wraps a label, hint, and error message around any input control."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Email address" htmlFor="sg-email" hint="We'll never share your email.">
            <Input id="sg-email" type="email" placeholder="you@example.com" />
          </Field>

          <Field label="Password" htmlFor="sg-password" error="Password must be at least 8 characters.">
            <Input id="sg-password" type="password" placeholder="••••••••" />
          </Field>

          <Field label="Property type" htmlFor="sg-select" hint="Choose the closest match.">
            <Select id="sg-select" defaultValue="">
              <option value="" disabled>
                Select a type…
              </option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="commercial">Commercial</option>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Skeletons" description="Loading placeholders at a few common shapes.">
        <div className="space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          <div className="flex gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </Section>

      <Section title="Tooltip" description="Shows content on hover or keyboard focus.">
        <Tooltip content="Saved to your favorites">
          <Button variant="secondary">Hover or focus me</Button>
        </Tooltip>
      </Section>

      <Section
        title="Dialog"
        description="Controlled modal dialog rendered via a portal. Requires a client boundary — see DialogDemo below."
      >
        <DialogDemo />
      </Section>

      <Section
        title="Motion"
        description="Scroll- and mount-triggered animation wrappers, respecting prefers-reduced-motion."
      >
        <div className="space-y-10">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text">FadeIn</h3>
            <FadeIn>
              <Card>
                <CardBody>
                  <p className="text-sm text-text">Fades and lifts into view once, on scroll.</p>
                </CardBody>
              </Card>
            </FadeIn>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text">SlideIn</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <SlideIn direction="up">
                <Card>
                  <CardBody>
                    <p className="text-sm text-text">direction=&quot;up&quot;</p>
                  </CardBody>
                </Card>
              </SlideIn>
              <SlideIn direction="left">
                <Card>
                  <CardBody>
                    <p className="text-sm text-text">direction=&quot;left&quot;</p>
                  </CardBody>
                </Card>
              </SlideIn>
              <SlideIn direction="right">
                <Card>
                  <CardBody>
                    <p className="text-sm text-text">direction=&quot;right&quot;</p>
                  </CardBody>
                </Card>
              </SlideIn>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text">Stagger</h3>
            <Stagger>
              <Card>
                <CardBody>
                  <p className="text-sm text-text">Item one</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-text">Item two</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-text">Item three</p>
                </CardBody>
              </Card>
            </Stagger>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text">Reveal</h3>
            <Reveal>
              <Card>
                <CardBody>
                  <p className="text-sm text-text">
                    Ties opacity and position to scroll progress as this block enters the viewport.
                  </p>
                </CardBody>
              </Card>
            </Reveal>
          </div>
        </div>
      </Section>
    </main>
  )
}
