import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Prop } from '../../types'

export function PropsTable({ props }: { props: Prop[] }) {
  const [open, setOpen] = useState(true)
  if (!props.length) return null

  const required = props.filter(p => p.required)

  return (
    <div>
      {/* Section toggle header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-6 py-3 text-left transition-colors"
        style={{ borderBottom: '1px solid var(--border)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform duration-100"
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            color: 'var(--text-muted)',
          }}
        />
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          Props
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {props.length} total{required.length > 0 && ` · ${required.length} required`}
        </span>
      </button>

      {open && (
        <div>
          {/* Column headers */}
          <div
            className="flex items-center gap-0 px-6 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
            }}
          >
            <span className="w-32 shrink-0">Name</span>
            <span className="w-28 shrink-0">Type</span>
            <span className="w-20 shrink-0">Default</span>
            <span className="flex-1">Description</span>
          </div>

          {/* Rows */}
          {props.map(prop => (
            <div
              key={prop.name}
              className="flex items-baseline gap-0 px-6 py-2.5 transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {/* Name */}
              <div className="w-32 shrink-0">
                <code
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-2)' }}
                >
                  {prop.name}
                  {prop.required && (
                    <span style={{ color: 'var(--error)' }} title="Required">*</span>
                  )}
                </code>
              </div>

              {/* Type */}
              <div className="w-28 shrink-0">
                <code
                  className="text-sm"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}
                >
                  {prop.type}
                </code>
              </div>

              {/* Default */}
              <div className="w-20 shrink-0">
                {prop.default != null ? (
                  <code
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {String(prop.default)}
                  </code>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </div>

              {/* Description */}
              <div className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {prop.description || '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
