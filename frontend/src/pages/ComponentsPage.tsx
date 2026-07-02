import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronRight, Package, Layers, ArrowRight } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'
import { fetchComponents } from '../services/api'
import { categoryLabel, categoryColour } from '../lib/utils'
import type { ComponentListItem } from '../types'

const ALL_CATEGORIES = [
  'all', 'auth', 'content', 'dashboard', 'data',
  'feedback', 'forms', 'layout', 'marketing', 'navigation', 'ui',
]

export function ComponentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['components'],
    queryFn: fetchComponents,
    staleTime: 1000 * 60 * 10,
  })

  const filtered = useMemo(() => {
    if (!data?.components) return []
    return data.components.filter((c: ComponentListItem) => {
      const matchesCategory = activeCategory === 'all' || c.category === activeCategory
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [data, activeCategory, search])

  const categoryCounts = useMemo(() => {
    if (!data?.components) return {}
    const counts: Record<string, number> = { all: data.components.length }
    for (const c of data.components) {
      counts[c.category] = (counts[c.category] ?? 0) + 1
    }
    return counts
  }, [data])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <div style={{ paddingTop: '64px' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="section-container py-8">
            <nav className="flex items-center gap-1.5 text-sm mb-3" aria-label="Breadcrumb">
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
              <span style={{ color: 'var(--text-primary)' }}>Components</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    fontWeight: 800,
                    letterSpacing: '-0.025em',
                    color: 'var(--text-primary)',
                  }}
                >
                  Component Library
                </h1>
                <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {data?.total ?? 42} production-ready Astro components across {ALL_CATEGORIES.length - 1} categories.
                </p>
              </div>

              {/* Search */}
              <div
                className="flex items-center gap-2 h-10 px-3 rounded-lg border"
                style={{
                  background: 'var(--bg-base)',
                  borderColor: 'var(--border)',
                  width: '280px',
                  maxWidth: '100%',
                }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search components..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category filters */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="section-container py-2 flex gap-1 overflow-x-auto">
            {ALL_CATEGORIES.map(cat => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-100"
                  style={{
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    color: isActive ? 'var(--accent-2)' : 'var(--text-muted)',
                    border: isActive ? '1px solid var(--accent-subtle)' : '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  {cat === 'all' ? 'All' : categoryLabel(cat)}
                  {categoryCounts[cat] != null && (
                    <span
                      className="text-xs px-1.5 rounded"
                      style={{
                        background: isActive ? 'var(--accent-2)' : 'var(--bg-subtle)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {categoryCounts[cat]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="section-container py-8">
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border animate-pulse"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', height: '200px' }}
                />
              ))}
            </div>
          )}

          {isError && (
            <div className="text-center py-16">
              <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Failed to load components
              </h2>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="text-center py-16">
              <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                No components found
              </h2>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                Try adjusting your search or filter.
              </p>
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((comp: ComponentListItem) => (
                <button
                  key={comp.name}
                  type="button"
                  onClick={() => navigate(`/components/${comp.name}`)}
                  className="group text-left rounded-lg border p-5 transition-all duration-150"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-2)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-8 w-8 rounded-md flex items-center justify-center"
                        style={{ background: 'var(--accent-subtle)' }}
                      >
                        <Package className="h-4 w-4" style={{ color: 'var(--accent-2)' }} />
                      </div>
                      <div>
                        <h3
                          className="text-base font-semibold"
                          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                        >
                          {comp.name}
                        </h3>
                      </div>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
                      style={{ color: 'var(--accent-2)' }}
                    />
                  </div>

                  {/* Category + props */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${categoryColour(comp.category)}`}
                    >
                      {categoryLabel(comp.category)}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Layers className="h-3 w-3" />
                      {comp.props_count} props
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    className="text-sm leading-relaxed mb-3"
                    style={{ color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {comp.description}
                  </p>

                  {/* Tags */}
                  {comp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {comp.tags.slice(0, 4).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs border"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-muted)',
                            borderColor: 'var(--border)',
                            background: 'var(--bg-subtle)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {comp.tags.length > 4 && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          +{comp.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
