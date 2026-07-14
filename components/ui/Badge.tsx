import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './variants'

const badge = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      neutral: 'bg-neutral-100 text-text',
      primary: 'bg-primary/10 text-primary',
      accent: 'bg-accent/15 text-accent-fg',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      danger: 'bg-danger/10 text-danger',
    },
  },
  defaultVariants: { variant: 'neutral' },
})

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badge({ variant }), className)} {...props} />
  ),
)
Badge.displayName = 'Badge'
export default Badge
