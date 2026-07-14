import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './variants'

const card = cva('rounded-lg border border-border bg-surface shadow-sm', {
  variants: {
    variant: {
      default: '',
      interactive: 'hover:shadow-md transition-shadow cursor-pointer',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof card> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(card({ variant }), className)} {...props} />
  ),
)
Card.displayName = 'Card'
export default Card

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 border-b border-border', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props} />
  ),
)
CardBody.displayName = 'CardBody'

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 border-t border-border', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'
