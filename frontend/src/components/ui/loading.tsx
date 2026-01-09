import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingState({ message = 'Loading...', size = 'lg', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-8', className)}>
      <LoadingSpinner size={size} />
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  )
}

interface CardSkeletonProps {
  className?: string
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn('animate-pulse space-y-4 rounded-lg border bg-card p-6', className)}>
      <div className="h-6 w-1/3 bg-muted rounded" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-5/6 bg-muted rounded" />
        <div className="h-4 w-4/6 bg-muted rounded" />
      </div>
    </div>
  )
}

interface ChartSkeletonProps {
  className?: string
  height?: string
}

export function ChartSkeleton({ className, height = 'h-64' }: ChartSkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-lg border bg-card p-6', className)}>
      <div className="space-y-4">
        <div className="h-6 w-1/4 bg-muted rounded" />
        <div className="h-4 w-1/2 bg-muted rounded" />
        <div className={cn('w-full bg-muted rounded mt-6', height)} />
      </div>
    </div>
  )
}
