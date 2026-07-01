interface NoMatchStateProps {
  query: string
  message: string
  onTrySuggestion: (q: string) => void
}

const FALLBACKS = [
  'Login form with email and password',
  'Responsive navigation bar with mobile menu',
  'Dashboard stats card with trend indicator',
  'Pricing table with highlighted plan',
]

export function NoMatchState({ query, message, onTrySuggestion }: NoMatchStateProps) {
  return (
    <div className="flex flex-col justify-center min-h-[400px] px-8 py-12 max-w-xl gap-8">

      {/* Header — mirrors ComponentCard header layout */}
      <div style={{ borderBottom: '1px solid var(--border)' }} className="pb-5">
        <div className="flex items-baseline gap-3">
          <span
            className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}
          >
            No match found
          </span>
        </div>
        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>
        <code
          className="inline-block mt-2 text-sm px-2 py-0.5 rounded"
          style={{
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-subtle)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          "{query}"
        </code>
      </div>

      {/* Fallback suggestions */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Try one of these queries:
        </p>
        <div className="space-y-1">
          {FALLBACKS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onTrySuggestion(s)}
              className="w-full flex items-center gap-3 h-10 px-3 rounded text-sm text-left transition-all"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-2)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
