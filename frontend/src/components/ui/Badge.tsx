import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'neutral' | 'blue' | 'green' | 'yellow' | 'red'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/60',
  blue:    'text-blue-400  bg-blue-950/40  border-blue-800/40',
  green:   'text-green-400 bg-green-950/40 border-green-800/40',
  yellow:  'text-yellow-400 bg-yellow-950/40 border-yellow-800/40',
  red:     'text-red-400   bg-red-950/40   border-red-800/40',
}

const dots: Record<BadgeVariant, string> = {
  neutral: 'bg-zinc-500',
  blue:    'bg-blue-400',
  green:   'bg-green-400',
  yellow:  'bg-yellow-400',
  red:     'bg-red-400',
}

export function Badge({ variant = 'neutral', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-medium border select-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dots[variant])} />}
      {children}
    </span>
  )
}
