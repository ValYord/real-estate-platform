import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from './variants'

export type SkeletonProps = HTMLAttributes<HTMLDivElement>

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('animate-pulse rounded-md bg-neutral-200', className)} {...props} />
  ),
)
Skeleton.displayName = 'Skeleton'
export default Skeleton
