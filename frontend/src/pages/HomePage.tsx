import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'
import { SearchBar } from '../components/search/SearchBar'
import { LeftPanel } from '../components/search/LeftPanel'
import { RightPanel } from '../components/results/RightPanel'
import { useSearch } from '../hooks/useSearch'
import { useSearchHistory } from '../hooks/useSearchHistory'
import type { SearchResult } from '../types'

/* ── Search states ────────────────────────────────────────────
   idle → searching → success | no_match | error
   ──────────────────────────────────────────────────────────── */
type SearchState = 'idle' | 'searching' | 'success' | 'no_match' | 'error'

export function HomePage() {
  const { mutateAsync, isPending, isError, error, reset: resetMutation } = useSearch()
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory()

  const [searchParams, setSearchParams] = useSearchParams()
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [lastQuery, setLastQuery] = useState('')
  const [displayedResult, setDisplayedResult] = useState<SearchResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const inflightRef = useRef<string | null>(null)
  const initialSearchDone = useRef(false)

  const handleSearch = useCallback(async (query: string) => {
    const q = query.trim()
    if (!q) return

    // Prevent duplicate concurrent requests
    if (inflightRef.current === q) return
    inflightRef.current = q

    setLastQuery(q)
    setSearchState('searching')
    setErrorMessage('')
    resetMutation()

    // Update URL without adding a new history entry on repeated searches
    setSearchParams({ q }, { replace: true })

    try {
      const result = await mutateAsync(q)
      inflightRef.current = null

      setDisplayedResult(result)
      setSearchState(result.no_match ? 'no_match' : 'success')

      addEntry({
        id:            crypto.randomUUID(),
        query:         q,
        timestamp:     Date.now(),
        componentName: result.no_match ? undefined : result.component,
        category:      result.no_match ? undefined : result.category,
      })
    } catch (err) {
      inflightRef.current = null
      const msg = err instanceof Error ? err.message : 'An unknown error occurred'
      if (msg === '__DUPLICATE__') return
      setSearchState('error')
      setErrorMessage(msg)
    }
  }, [mutateAsync, addEntry, setSearchParams, resetMutation])

  // URL sync: run search from ?q= on mount / back-forward
  useEffect(() => {
    const q = searchParams.get('q')?.trim()
    if (q && !initialSearchDone.current) {
      initialSearchDone.current = true
      handleSearch(q)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
              isLoading={isPending}
              initialValue={searchParams.get('q') ?? lastQuery}
              key={lastQuery || 'initial'}
            />
          </div>
        </div>

        {/* Error banner */}
        {searchState === 'error' && (
          <div
            className="flex items-center gap-3 px-6 py-3"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--error)',
              flexShrink: 0,
            }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm">{errorMessage || 'Something went wrong. Please try again.'}</span>
            <button
              type="button"
              onClick={() => { setSearchState('idle'); setErrorMessage('') }}
              className="ml-auto text-xs font-medium px-2 py-1 rounded transition-colors"
              style={{ color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              Dismiss
            </button>
          </div>
        )}

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
              isLoading={isPending}
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
              isLoading={isPending}
              isError={isError}
              errorMessage={errorMessage}
              query={lastQuery}
              onSearch={handleSearch}
            />
          </main>
        </div>
      </div>
    </div>
  )
}
