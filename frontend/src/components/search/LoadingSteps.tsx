import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { LOADING_STEPS } from '../../types'

export function LoadingSteps({ isLoading }: { isLoading: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    if (!isLoading) { setActiveIdx(0); return }

    let idx = 0
    const advance = () => {
      if (idx < LOADING_STEPS.length - 1) {
        setTimeout(() => { idx += 1; setActiveIdx(idx); advance() }, LOADING_STEPS[idx].durationMs)
      }
    }
    advance()

    return () => { idx = LOADING_STEPS.length }
  }, [isLoading])

  if (!isLoading) return null

  return (
    <section className="pb-1">
      <div className="flex items-center px-4 h-9">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          Processing
        </span>
      </div>

      {LOADING_STEPS.map((step, i) => {
        const done   = i < activeIdx
        const active = i === activeIdx

        return (
          <div
            key={step.id}
            className="flex items-center gap-3 h-9 px-4 text-sm"
            style={{
              color: done
                ? 'var(--text-muted)'
                : active
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
              opacity: i > activeIdx ? 0.4 : 1,
            }}
          >
            <span className="flex items-center justify-center h-4 w-4 shrink-0">
              {done ? (
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
              ) : active ? (
                <svg className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--accent-2)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                </svg>
              ) : (
                <span
                  className="h-1.5 w-1.5 rounded-full block"
                  style={{ background: 'var(--border-strong)' }}
                />
              )}
            </span>
            <span style={{ textDecoration: done ? 'line-through' : 'none' }}>
              {step.label}
            </span>
          </div>
        )
      })}
    </section>
  )
}
