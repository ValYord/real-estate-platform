import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from './variants'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-md border border-border bg-surface px-3 text-text placeholder:text-muted ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'
export default Input
