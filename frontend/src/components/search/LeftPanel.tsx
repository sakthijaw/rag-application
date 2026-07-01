import { SearchHistory } from './SearchHistory'
import { SuggestedPrompts } from './SuggestedPrompts'
import { LoadingSteps } from './LoadingSteps'
import type { SearchHistoryItem } from '../../types'

interface LeftPanelProps {
  isLoading: boolean
  history: SearchHistoryItem[]
  onSelectHistory: (query: string) => void
  onRemoveHistory: (id: string) => void
  onClearHistory: () => void
  onSelectSuggestion: (query: string) => void
}

export function LeftPanel({
  isLoading,
  history,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  onSelectSuggestion,
}: LeftPanelProps) {
  return (
    <nav className="flex flex-col py-2">
      {isLoading && <LoadingSteps isLoading />}

      {!isLoading && history.length > 0 && (
        <SearchHistory
          history={history}
          onSelect={onSelectHistory}
          onRemove={onRemoveHistory}
          onClear={onClearHistory}
        />
      )}

      {!isLoading && history.length > 0 && (
        <div
          className="mx-4 my-2"
          style={{ height: '1px', background: 'var(--border)' }}
        />
      )}

      {!isLoading && (
        <SuggestedPrompts onSelect={onSelectSuggestion} />
      )}
    </nav>
  )
}
