import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'

const PIPELINE_STEPS = [
  { label: 'Query',  desc: 'Natural language input'         },
  { label: 'Embed',  desc: 'all-MiniLM-L6-v2 · 384 dims'  },
  { label: 'Search', desc: 'FAISS IndexFlatIP · 42 vectors' },
  { label: 'Rank',   desc: 'Cosine similarity score'        },
  { label: 'LLM',   desc: 'Groq llama-3.3-70b-versatile'  },
  { label: 'Result', desc: 'Structured JSON response'       },
]

export function EmptyState() {
  const reduced = useReducedMotion()

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[480px] px-12 py-16 gap-12">

      {/* Pipeline diagram */}
      <div className="flex items-center gap-0 flex-wrap justify-center">
        {PIPELINE_STEPS.map((step, i) => (
          <motion.div
            key={step.label}
            initial={reduced ? {} : { opacity: 0, y: 12 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center"
          >
            {/* Step */}
            <div className="flex flex-col items-center text-center px-2 py-1">
              <span
                className="text-xs font-semibold mb-0.5 font-mono"
                style={{ color: 'var(--accent-2)' }}
              >
                {step.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {step.desc}
              </span>
            </div>

            {/* Arrow between steps */}
            {i < PIPELINE_STEPS.length - 1 && (
              <svg viewBox="0 0 20 16" fill="none" className="h-4 shrink-0 mx-1">
                <path
                  d="M1 8h16m0 0-5-5m5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--border-strong)' }}
                />
              </svg>
            )}
          </motion.div>
        ))}
      </div>

      {/* Copy */}
      <div className="text-center max-w-sm space-y-2">
        <h2
          className="text-xl"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 700 }}
        >
          Ready to search
        </h2>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Type a description above — the RAG pipeline retrieves the best-matching
          component from 42 indexed Astro components.
        </p>
      </div>

      {/* Stat row */}
      <div
        className="flex items-center gap-6 text-sm pb-0.5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        {[
          ['42', 'Components'],
          ['10', 'Categories'],
          ['384', 'Vector dims'],
          ['WCAG 2.1', 'Accessibility'],
        ].map(([val, label]) => (
          <div key={label} className="text-center pb-2">
            <div
              className="text-lg font-semibold font-mono"
              style={{ color: 'var(--accent-2)', fontFamily: 'var(--font-mono)' }}
            >
              {val}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Back to landing */}
      <Link
        to="/"
        className="text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-2)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        ← View component showcase
      </Link>
    </div>
  )
}
