import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Search, X, ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FormValues { query: string }

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading: boolean
  initialValue?: string
}

export function SearchBar({ onSearch, isLoading, initialValue = '' }: SearchBarProps) {
  const { register, handleSubmit, watch, setValue, setFocus } = useForm<FormValues>({
    defaultValues: { query: initialValue },
  })
  const query = watch('query')

  useEffect(() => { setFocus('query') }, [setFocus])

  const onSubmit = ({ query }: FormValues) => {
    const q = query.trim()
    if (q) onSearch(q)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div
        className={cn(
          'flex items-center gap-3 h-12 px-4 rounded-lg border transition-all duration-150',
        )}
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
        onFocusCapture={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--accent-2)'
          el.style.boxShadow   = '0 0 0 3px var(--accent-glow)'
        }}
        onBlurCapture={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--border)'
          el.style.boxShadow   = 'none'
        }}
      >
        {/* Leading icon / spinner */}
        <div className="shrink-0">
          {isLoading ? (
            <svg
              className="h-4 w-4 animate-spin"
              style={{ color: 'var(--accent-2)' }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            >
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
            </svg>
          ) : (
            <Search className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          )}
        </div>

        {/* Input */}
        <input
          {...register('query', { required: true })}
          type="text"
          placeholder="Describe the component you need — e.g. 'login form with OAuth'"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-base focus:outline-none"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        />

        {/* Clear */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => { setValue('query', ''); setFocus('query') }}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!query?.trim() || isLoading}
          className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
          style={{
            background: 'var(--accent-2)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Search
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
  )
}
