import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'danger'
  size?: 'xs' | 'sm' | 'md'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'sm', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium select-none cursor-pointer',
        'transition-colors duration-75 focus-ring',
        'disabled:pointer-events-none disabled:opacity-40',

        size === 'xs' && 'h-6 px-2 text-xs rounded',
        size === 'sm' && 'h-7 px-2.5 text-sm rounded',
        size === 'md' && 'h-8 px-3 text-base rounded',

        variant === 'default' && [
          'border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600',
        ],
        variant === 'ghost' && [
          'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800',
        ],
        variant === 'outline' && [
          'border border-zinc-700 text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100',
        ],
        variant === 'danger' && [
          'text-red-400 hover:bg-red-950/40 hover:text-red-300',
        ],

        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
        </svg>
      )}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
