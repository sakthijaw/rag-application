import { EmptyState } from './EmptyState'
import { NoMatchState } from './NoMatchState'
import { ComponentCard } from './ComponentCard'
import { ResultSkeleton } from '../ui/Skeleton'
import type { SearchResult } from '../../types'

interface RightPanelProps {
  result: SearchResult | null
  isLoading: boolean
  query: string
  onSearch: (query: string) => void
}

export function RightPanel({ result, isLoading, query, onSearch }: RightPanelProps) {
  return (
    <div style={{ minHeight: '100%' }}>
      {isLoading && <ResultSkeleton />}

      {!isLoading && !result && <EmptyState />}

      {!isLoading && result?.no_match === true && (
        <NoMatchState
          query={query}
          message={result.message}
          onTrySuggestion={onSearch}
        />
      )}

      {!isLoading && result && result.no_match === false && (
        <ComponentCard result={result} onSearch={onSearch} />
      )}
    </div>
  )
}
