import { useState } from 'react'
import { Copy, Check, ChevronRight } from 'lucide-react'
import { categoryLabel } from '../../lib/utils'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { SimilarityBar } from './SimilarityBar'
import { CodeBlock } from './CodeBlock'
import { PropsTable } from './PropsTable'
import { AlternativeCard } from './AlternativeCard'
import type { ComponentResult } from '../../types'

interface ComponentCardProps {
  result: ComponentResult
  onSearch: (query: string) => void
}

/* ── Shared section divider component ─────────────────── */
function Divider() {
  return <div style={{ height: '1px', background: 'var(--border)' }} />
}

function SectionHeading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-2.5"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
      >
        {children}
      </span>
      {aside}
    </div>
  )
}

/* ── Confidence → colour mapping ──────────────────────── */
const CONF_COLOUR: Record<string, string> = {
  high:   'var(--success)',
  medium: 'var(--warning)',
  low:    'var(--error)',
}

export function ComponentCard({ result, onSearch }: ComponentCardProps) {
  const [usageOpen, setUsageOpen] = useState(false)
  const { copied: importCopied, copy: copyImport } = useCopyToClipboard()
  const { copied: usageCopied,  copy: copyUsage  } = useCopyToClipboard()

  const importLine = `import ${result.component} from '${result.import_path}'`
  const confColor  = CONF_COLOUR[result.confidence] ?? 'var(--text-muted)'

  return (
    <div className="animate-fade-in" style={{ color: 'var(--text-primary)' }}>

      {/* ─────────────────────────────────────────────────
          HEADER — component name, category, import copy
          ───────────────────────────────────────────────── */}
      <div
        className="px-6 pt-6 pb-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* Component name — Syne font, display weight */}
            <h1
              className="leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
              }}
            >
              {result.component}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {/* Category chip */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border"
                style={{
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent-2)',
                  borderColor: 'var(--accent-subtle)',
                }}
              >
                {categoryLabel(result.category)}
              </span>

              {/* Confidence */}
              <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <span
                  className="h-2 w-2 rounded-full inline-block"
                  style={{ background: confColor }}
                />
                <span style={{ color: confColor, fontWeight: 500 }}>{result.confidence}</span>
                <span>confidence</span>
              </span>

              {/* Import path — truncated mono */}
              <code
                className="text-xs hidden md:block truncate max-w-[280px]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
              >
                {result.import_path}
              </code>
            </div>
          </div>

          {/* Copy import button */}
          <CopyButton copied={importCopied} onCopy={() => copyImport(importLine)} label="Copy import" />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────
          MATCH SCORE
          ───────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-6 px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)', width: '80px' }}>
          Match score
        </span>
        <SimilarityBar score={result.similarity} className="flex-1" />
      </div>

      {/* ─────────────────────────────────────────────────
          REASON / DESCRIPTION
          ───────────────────────────────────────────────── */}
      <div
        className="px-6 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {result.reason}
        </p>
      </div>

      {/* ─────────────────────────────────────────────────
          IMPORT PATH
          ───────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionHeading>Import</SectionHeading>
        <div className="px-6 py-4">
          <CodeBlock
            code={importLine}
            language="typescript"
            copyable={false}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────
          USAGE (collapsible)
          ───────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setUsageOpen(v => !v)}
          className="w-full flex items-center justify-between px-6 py-2.5 transition-colors"
          style={{ borderBottom: usageOpen ? '1px solid var(--border)' : 'none', background: 'var(--bg-subtle)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-base)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
        >
          <div className="flex items-center gap-2.5">
            <ChevronRight
              className="h-3.5 w-3.5 transition-transform duration-100"
              style={{ transform: usageOpen ? 'rotate(90deg)' : 'none', color: 'var(--text-muted)' }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
            >
              Usage
            </span>
          </div>
          <CopyButton
            copied={usageCopied}
            onCopy={e => { e.stopPropagation(); copyUsage(result.usage) }}
            label="Copy"
            compact
          />
        </button>
        {usageOpen && (
          <div className="px-6 py-4">
            <CodeBlock
              code={result.usage}
              title={`${result.component}.astro`}
              copyable={false}
            />
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────
          PROPS TABLE
          ───────────────────────────────────────────────── */}
      {result.props.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <PropsTable props={result.props} />
        </div>
      )}

      {/* ─────────────────────────────────────────────────
          TAGS
          ───────────────────────────────────────────────── */}
      {result.tags.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <SectionHeading>Tags</SectionHeading>
          <div className="px-6 py-4 flex flex-wrap gap-2">
            {result.tags.map(tag => (
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
        </div>
      )}

      {/* ─────────────────────────────────────────────────
          ACCESSIBILITY
          ───────────────────────────────────────────────── */}
      {result.accessibility_notes && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <SectionHeading>Accessibility</SectionHeading>
          <div className="px-6 py-4">
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {result.accessibility_notes}
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────
          ALTERNATIVES
          ───────────────────────────────────────────────── */}
      {result.alternatives.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <SectionHeading aside={
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {result.alternatives.length} found
            </span>
          }>
            Alternatives
          </SectionHeading>

          {/* Column headers */}
          <div
            className="flex items-center gap-0 px-6 py-2 text-xs font-semibold uppercase"
            style={{
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
            }}
          >
            <span className="w-44 shrink-0">Component</span>
            <span className="w-24 shrink-0">Category</span>
            <span className="w-12 shrink-0">Match</span>
            <span className="flex-1 hidden sm:block">Description</span>
          </div>

          {result.alternatives.map((alt, i) => (
            <AlternativeCard key={alt.name} alt={alt} onSearch={onSearch} index={i} />
          ))}
        </div>
      )}

      {/* Bottom breathing room */}
      <div style={{ height: '48px' }} />
    </div>
  )
}

/* ── Copy button — used in header and usage section ──── */
function CopyButton({
  copied, onCopy, label, compact = false,
}: {
  copied: boolean
  onCopy: (e: React.MouseEvent<HTMLButtonElement>) => void
  label: string
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`shrink-0 flex items-center gap-1.5 rounded border font-medium transition-all duration-150 ${
        compact ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm'
      }`}
      style={{
        background:   copied ? 'rgba(16,185,129,0.08)' : 'var(--bg-surface)',
        color:        copied ? 'var(--success)' : 'var(--text-secondary)',
        borderColor:  copied ? 'rgba(16,185,129,0.3)' : 'var(--border)',
      }}
      onMouseEnter={e => {
        if (!copied) {
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.borderColor = 'var(--border-strong)'
        }
      }}
      onMouseLeave={e => {
        if (!copied) {
          e.currentTarget.style.color = 'var(--text-secondary)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }
      }}
    >
      {copied
        ? <><Check className="h-3.5 w-3.5" />Copied</>
        : <><Copy className="h-3.5 w-3.5" />{label}</>
      }
    </button>
  )
}
