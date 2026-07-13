import type { ReactNode } from 'react'

export interface SectionProps {
  title: string
  description?: string
  children: ReactNode
}

/** Repeated section header + spacing wrapper used throughout the /styleguide page. */
export default function Section({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-6 border-t border-border pt-12 first:border-t-0 first:pt-0">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-text">{title}</h2>
        {description ? <p className="max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  )
}
