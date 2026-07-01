import { categoryLabel, formatSimilarity } from '../../lib/utils'
import type { Alternative } from '../../types'

interface AlternativeCardProps {
  alt: Alternative
  onSearch: (query: string) => void
  index: number
}

export function AlternativeCard({ alt, onSearch }: AlternativeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSearch(alt.name)}
      className="w-full flex items-center gap-0 px-6 py-3 text-left transition-colors group"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Component name */}
      <code
        className="w-44 shrink-0 text-sm font-medium transition-colors"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
      >
        {alt.name}
      </code>

      {/* Category */}
      <span className="w-24 shrink-0 text-sm" style={{ color: 'var(--text-muted)' }}>
        {categoryLabel(alt.category)}
      </span>

      {/* Score */}
      <span
        className="w-12 shrink-0 text-sm tabular-nums"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
      >
        {formatSimilarity(alt.similarity)}
      </span>

      {/* Description */}
      {alt.description && (
        <span className="flex-1 text-sm truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>
          {alt.description}
        </span>
      )}

      {/* Arrow */}
      <span
        className="ml-auto shrink-0 text-sm transition-colors"
        style={{ color: 'var(--border-strong)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-2)')}
      >
        →
      </span>
    </button>
  )
}
