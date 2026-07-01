import { SUGGESTED_PROMPTS } from '../../types'

interface SuggestedPromptsProps {
  onSelect: (query: string) => void
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <section className="pb-1">
      <div className="flex items-center px-4 h-9">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          Suggested
        </span>
      </div>

      {SUGGESTED_PROMPTS.map(prompt => (
        <button
          key={prompt.query}
          type="button"
          onClick={() => onSelect(prompt.query)}
          className="w-full flex items-center gap-3 h-9 px-4 text-left text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-base)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = ''
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          {/* Arrow mark */}
          <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }}>
            <path d="M1 6h10M6.5 1.5 11 6l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{prompt.label}</span>
        </button>
      ))}
    </section>
  )
}
