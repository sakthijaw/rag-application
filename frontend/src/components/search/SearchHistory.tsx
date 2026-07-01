import { X, RotateCcw } from 'lucide-react'
import { timeAgo, categoryLabel } from '../../lib/utils'
import type { SearchHistoryItem } from '../../types'

interface SearchHistoryProps {
  history: SearchHistoryItem[]
  onSelect: (query: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function SearchHistory({ history, onSelect, onRemove, onClear }: SearchHistoryProps) {
  if (!history.length) return null

  return (
    <section className="pb-1">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-9">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          Recent
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Clear all
        </button>
      </div>

      {/* Items */}
      {history.map(item => (
        <div
          key={item.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(item.query)}
          onKeyDown={e => e.key === 'Enter' && onSelect(item.query)}
          className="group relative flex items-center gap-2.5 h-9 px-4 cursor-pointer transition-colors"
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
          <RotateCcw className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }} />

          <span className="flex-1 text-sm truncate min-w-0">{item.query}</span>

          <span className="text-xs shrink-0 group-hover:opacity-0 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            {item.category ? categoryLabel(item.category) : timeAgo(item.timestamp)}
          </span>

          {/* Remove — appears on hover */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove(item.id) }}
            className="absolute right-3 h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </section>
  )
}
