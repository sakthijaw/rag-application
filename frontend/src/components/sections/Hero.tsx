import { useReducedMotion, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Github } from 'lucide-react'

/* ─────────────────────────────────────────────────────────
   FLOATING COMPONENT CARDS
   These are NOT interactive previews — they're visual
   representations that establish the "component library"
   narrative in the hero background.
   ───────────────────────────────────────────────────────── */

interface FloatCard {
  id: string
  delay: number
  duration: number
  style: React.CSSProperties
  content: React.ReactNode
}

function ButtonCard() {
  return (
    <div className="p-4 space-y-2.5 w-52">
      <p className="text-xs font-medium opacity-50" style={{ fontFamily: 'var(--font-mono)' }}>Button</p>
      <div className="flex gap-2 flex-wrap">
        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-white" style={{ background: 'var(--accent-2)' }}>
          Primary
        </span>
        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
          Secondary
        </span>
      </div>
      <div className="flex gap-2">
        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-dashed" style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>
          Ghost
        </span>
      </div>
    </div>
  )
}

function ConfidenceCard() {
  return (
    <div className="p-4 space-y-3 w-56">
      <p className="text-xs font-medium opacity-50" style={{ fontFamily: 'var(--font-mono)' }}>ConfidenceBar</p>
      <div className="space-y-2">
        {[
          { label: 'Accuracy', pct: 94, color: '#10B981' },
          { label: 'Relevance', pct: 78, color: '#7C3AED' },
          { label: 'Confidence', pct: 61, color: '#F59E0B' },
        ].map(({ label, pct, color }) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs opacity-60">
              <span>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{pct}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StreamCard() {
  return (
    <div className="p-4 space-y-3 w-60">
      <p className="text-xs font-medium opacity-50" style={{ fontFamily: 'var(--font-mono)' }}>StreamingText</p>
      <div className="space-y-1.5 text-xs opacity-70 leading-relaxed">
        <p>The component uses semantic</p>
        <p>HTML with WAI-ARIA roles for</p>
        <p>screen reader support<span className="inline-block w-0.5 h-3.5 ml-0.5 bg-current opacity-80 align-middle animate-pulse" /></p>
      </div>
    </div>
  )
}

function InputCard() {
  return (
    <div className="p-4 space-y-3 w-56">
      <p className="text-xs font-medium opacity-50" style={{ fontFamily: 'var(--font-mono)' }}>PromptInput</p>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md border text-xs"
        style={{ borderColor: 'rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.08)' }}
      >
        <span className="opacity-40 flex-1">Describe a component...</span>
        <span style={{ color: 'var(--accent-glow)', fontFamily: 'var(--font-mono)' }}>↵</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['login form', 'data table', 'nav bar'].map(tag => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-xs border"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

const FLOAT_CARDS: FloatCard[] = [
  {
    id: 'buttons',
    delay: 0,
    duration: 6.5,
    style: { top: '18%', right: '6%' },
    content: <ButtonCard />,
  },
  {
    id: 'confidence',
    delay: 1.2,
    duration: 7.2,
    style: { bottom: '22%', right: '12%' },
    content: <ConfidenceCard />,
  },
  {
    id: 'stream',
    delay: 0.7,
    duration: 5.8,
    style: { top: '28%', left: '3%' },
    content: <StreamCard />,
  },
  {
    id: 'input',
    delay: 2,
    duration: 6.8,
    style: { bottom: '18%', left: '7%' },
    content: <InputCard />,
  },
]

function FloatingCard({ card, reduced }: { card: FloatCard; reduced: boolean }) {
  return (
    <motion.div
      aria-hidden
      animate={reduced ? {} : {
        y: [0, -18, 0],
        transition: {
          duration: card.duration,
          delay: card.delay,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      className="absolute hidden xl:block"
      style={card.style}
    >
      <div
        className="rounded-xl border text-white shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'rgba(255,255,255,0.09)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {card.content}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────
   HERO BACKGROUND — CSS-only mesh gradient
   Blob divs with blur + animation. No canvas.
   ───────────────────────────────────────────────────────── */

function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="blob w-[700px] h-[700px] animate-blob-drift-slow"
        style={{
          background: 'radial-gradient(circle, var(--blob-1), transparent 70%)',
          top: '-180px',
          left: '-180px',
        }}
      />
      <div
        className="blob w-[600px] h-[600px] animate-blob-drift-medium"
        style={{
          background: 'radial-gradient(circle, var(--blob-2), transparent 70%)',
          bottom: '-100px',
          right: '-100px',
          animationDelay: '-9s',
        }}
      />
      <div
        className="blob w-[500px] h-[500px] animate-blob-drift-fast"
        style={{
          background: 'radial-gradient(circle, var(--blob-3), transparent 70%)',
          top: '40%',
          left: '45%',
          animationDelay: '-4s',
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   HERO — main export
   ───────────────────────────────────────────────────────── */

// Stagger config — slightly irregular (0.08s) per spec
const STAGGER = [0, 0.08, 0.16, 0.26, 0.38, 0.52]

function FadeUp({
  children,
  delay = 0,
  className = '',
  reduced,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  reduced: boolean
}) {
  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 24 }}
      animate={reduced ? {} : { opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Hero() {
  const reduced = useReducedMotion() ?? false

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
      aria-labelledby="hero-headline"
    >
      <HeroBackground />

      {/* Floating cards */}
      {FLOAT_CARDS.map(card => (
        <FloatingCard key={card.id} card={card} reduced={reduced} />
      ))}

      {/* Main content */}
      <div className="relative z-10 section-container flex flex-col items-center gap-6 pt-24 pb-16">

        {/* Eyebrow chip */}
        <FadeUp delay={STAGGER[0]} reduced={reduced}>
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-medium"
            style={{
              borderColor: 'var(--accent-subtle)',
              background: 'var(--accent-subtle)',
              color: 'var(--accent-2)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--accent-2)' }}
            />
            RAG-powered · 42 components · WCAG 2.1 AA
          </div>
        </FadeUp>

        {/* Headline */}
        <FadeUp delay={STAGGER[1]} reduced={reduced} className="max-w-4xl">
          <h1
            id="hero-headline"
            className="font-display"
            style={{
              fontSize: 'clamp(2.5rem, 7vw, 3.75rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Every Pixel.{' '}
            <span className="text-gradient">Precisely Engineered.</span>
          </h1>
        </FadeUp>

        {/* Sub-headline */}
        <FadeUp delay={STAGGER[2]} reduced={reduced} className="max-w-xl">
          <p
            className="text-lg leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            A living component library built for AI-native products —
            semantically indexed, RAG-searchable, and production-ready
            from day one.
          </p>
        </FadeUp>

        {/* CTAs */}
        <FadeUp delay={STAGGER[3]} reduced={reduced}>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link
              to="/components"
              className="btn-solid"
            >
              Explore components
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </FadeUp>

        {/* Trust bar */}
        <FadeUp delay={STAGGER[4]} reduced={reduced}>
          <div
            className="flex flex-wrap items-center justify-center gap-6 mt-4 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {[
              '42 components',
              '10 categories',
              'WCAG 2.1 AA',
              'RAG-indexed',
              'Open source',
            ].map((item, i) => (
              <span key={item} className="flex items-center gap-2">
                {i > 0 && (
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ background: 'var(--border-strong)' }}
                    aria-hidden
                  />
                )}
                {item}
              </span>
            ))}
          </div>
        </FadeUp>
      </div>

      {/* Scroll indicator */}
      {!reduced && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          aria-hidden
        >
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
          >
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown
              className="h-4 w-4"
              style={{ color: 'var(--text-muted)' }}
            />
          </motion.div>
        </motion.div>
      )}
    </section>
  )
}
