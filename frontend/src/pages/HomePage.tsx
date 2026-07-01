import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'
import { SearchBar } from '../components/search/SearchBar'
import { LeftPanel } from '../components/search/LeftPanel'
import { RightPanel } from '../components/results/RightPanel'
import { useSearch } from '../hooks/useSearch'
import { useSearchHistory } from '../hooks/useSearchHistory'
import type { SearchResult } from '../types'

export function HomePage() {
  const search  = useSearch()
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory()

  const [lastQuery,       setLastQuery]       = useState('')
  const [displayedResult, setDisplayedResult] = useState<SearchResult | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    const q = query.trim()
    if (!q) return
    setLastQuery(q)

    const result = await search.mutateAsync(q).catch(() => null)
    if (!result) return

    setDisplayedResult(result)
    addEntry({
      id:            crypto.randomUUID(),
      query:         q,
      timestamp:     Date.now(),
      componentName: result.no_match ? undefined : result.component,
      category:      result.no_match ? undefined : result.category,
    })
  }, [search, addEntry])

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}
    >
      {/* Shared navbar — same as landing page */}
      <Navbar />

      {/* Workspace — fills below navbar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '64px' }}>

        {/* Page header strip */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <div className="section-container flex items-end justify-between py-4 gap-4">
            <div>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm mb-1.5" aria-label="Breadcrumb">
                <Link
                  to="/"
                  className="transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  AstroRAG
                </Link>
                <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-primary)' }}>Component Search</span>
              </nav>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}
              >
                Component Search
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Describe what you need — retrieved directly from the vector index.
              </p>
            </div>

            {/* Status pill */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm shrink-0"
              style={{
                background: 'var(--accent-subtle)',
                color: 'var(--accent-2)',
                border: '1px solid var(--accent-subtle)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-2)' }} />
              RAG pipeline active
            </div>
          </div>
        </div>

        {/* Search bar strip */}
        <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div className="section-container py-3">
            <SearchBar
              onSearch={handleSearch}
              isLoading={search.isPending}
              initialValue={lastQuery}
              key={lastQuery || 'initial'}
            />
          </div>
        </div>

        {/* Two-panel workspace */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left sidebar */}
          <aside
            style={{
              width: '256px',
              flexShrink: 0,
              borderRight: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
              overflowY: 'auto',
            }}
          >
            <LeftPanel
              isLoading={search.isPending}
              history={history}
              onSelectHistory={handleSearch}
              onRemoveHistory={removeEntry}
              onClearHistory={clearHistory}
              onSelectSuggestion={handleSearch}
            />
          </aside>

          {/* Result area */}
          <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
            <RightPanel
              result={displayedResult}
              isLoading={search.isPending}
              query={lastQuery}
              onSearch={handleSearch}
            />
          </main>
        </div>
      </div>
    </div>
  )
}
