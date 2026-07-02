import { EmptyState } from './EmptyState'
import { NoMatchState } from './NoMatchState'
import { ComponentCard } from './ComponentCard'
import { ResultSkeleton } from '../ui/Skeleton'
import type { SearchResult } from '../../types'

interface RightPanelProps {
  result: SearchResult | null
  isLoading: boolean
  isError?: boolean
  errorMessage?: string
  query: string
  onSearch: (query: string) => void
}

export function RightPanel({ result, isLoading, isError, errorMessage, query, onSearch }: RightPanelProps) {
  return (
    <div style={{ minHeight: '100%' }}>
      {isLoading && <ResultSkeleton />}

      {!isLoading && !result && !isError && <EmptyState />}

      {!isLoading && isError && (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-8 py-12 gap-6">
          <div className="text-center max-w-sm space-y-2">
            <h2
              className="text-xl"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 700 }}
            >
              Something went wrong
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {errorMessage || 'Could not complete the search. Please check the API server and try again.'}
            </p>
          </div>
          {query && (
            <button
              type="button"
              onClick={() => onSearch(query)}
              className="text-sm transition-colors px-4 py-2 rounded border"
              style={{ color: 'var(--accent-2)', borderColor: 'var(--border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-2)'
                e.currentTarget.style.background = 'var(--accent-subtle)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = ''
              }}
            >
              Retry search
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && result?.no_match === true && (
        <NoMatchState
          query={query}
          message={result.message}
          onTrySuggestion={onSearch}
        />
      )}

      {!isLoading && !isError && result && result.no_match === false && (
        <ComponentCard result={result} onSearch={onSearch} />
      )}
    </div>
  )
}
