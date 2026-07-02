import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ArrowLeft, Package, Copy, Check } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'
import { CodeBlock } from '../components/results/CodeBlock'
import { PropsTable } from '../components/results/PropsTable'
import { fetchComponentDetail } from '../services/api'
import { categoryLabel, categoryColour } from '../lib/utils'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'

export function ComponentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { copied, copy } = useCopyToClipboard()

  const { data: comp, isLoading, isError, error } = useQuery({
    queryKey: ['component', id],
    queryFn: () => fetchComponentDetail(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  })

  const importLine = comp ? `import ${comp.name} from '${comp.import_path}'` : ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <div style={{ paddingTop: '64px' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="section-container py-6">
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
              <Link
                to="/components"
                className="transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Components
              </Link>
              <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-primary)' }}>{id}</span>
            </nav>

            <button
              type="button"
              onClick={() => navigate('/components')}
              className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-2)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to library
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="section-container py-8">
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded animate-pulse"
                  style={{ background: 'var(--border)', height: i === 0 ? '80px' : '48px' }}
                />
              ))}
            </div>
          )}

          {isError && (
            <div className="text-center py-16">
              <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Component not found
              </h2>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <Link
                to="/components"
                className="inline-flex items-center gap-1.5 text-sm mt-4 transition-colors"
                style={{ color: 'var(--accent-2)' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Browse all components
              </Link>
            </div>
          )}

          {comp && (
            <div className="max-w-4xl">
              {/* Component header */}
              <div
                className="rounded-lg border p-6 mb-6"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--accent-subtle)' }}
                    >
                      <Package className="h-6 w-6" style={{ color: 'var(--accent-2)' }} />
                    </div>
                    <div>
                      <h1
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.75rem',
                          fontWeight: 800,
                          letterSpacing: '-0.025em',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {comp.name}
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${categoryColour(comp.category)}`}
                        >
                          {categoryLabel(comp.category)}
                        </span>
                        <code
                          className="text-xs hidden sm:block"
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
                        >
                          {comp.file_path}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Copy import */}
                  <button
                    type="button"
                    onClick={() => copy(importLine)}
                    className="shrink-0 flex items-center gap-1.5 rounded border font-medium h-8 px-3 text-sm transition-all duration-150"
                    style={{
                      background: copied ? 'rgba(16,185,129,0.08)' : 'var(--bg-base)',
                      color: copied ? 'var(--success)' : 'var(--text-secondary)',
                      borderColor: copied ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                    }}
                  >
                    {copied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy import</>}
                  </button>
                </div>

                <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {comp.description}
                </p>
              </div>

              {/* Import */}
              <Section title="Import">
                <CodeBlock code={importLine} language="typescript" copyable={false} />
              </Section>

              {/* Usage */}
              {comp.usage_example && (
                <Section title="Usage Example">
                  <CodeBlock code={comp.usage_example} title={`${comp.name}.astro`} />
                </Section>
              )}

              {/* Props */}
              {comp.props.length > 0 && (
                <div
                  className="rounded-lg border mb-6 overflow-hidden"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                >
                  <PropsTable props={comp.props} />
                </div>
              )}

              {/* Slots */}
              {comp.slots.length > 0 && (
                <Section title="Slots">
                  <div className="space-y-2">
                    {comp.slots.map((slot: { name: string; description: string }) => (
                      <div
                        key={slot.name}
                        className="flex items-baseline gap-4 py-2"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <code
                          className="text-sm font-medium shrink-0"
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-2)', width: '120px' }}
                        >
                          {slot.name}
                        </code>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {slot.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Accessibility */}
              {comp.accessibility_notes && (
                <Section title="Accessibility">
                  <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {comp.accessibility_notes}
                  </p>
                </Section>
              )}

              {/* Tags */}
              {comp.tags.length > 0 && (
                <Section title="Tags">
                  <div className="flex flex-wrap gap-2">
                    {comp.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs border"
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
                  </div>
                </Section>
              )}

              {/* Bottom spacer */}
              <div style={{ height: '48px' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Section wrapper ───────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border mb-6 overflow-hidden"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="px-6 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          {title}
        </span>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  )
}
