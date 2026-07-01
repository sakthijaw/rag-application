import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Menu, X, Github, ArrowRight } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

const NAV_LINKS = [
  { label: 'Components', href: '/#components' },
  { label: 'AI Suite',   href: '/#ai-suite'   },
  { label: 'RAG Demo',  href: '/rag-demo'     },
  { label: 'Docs',      href: '/#docs'        },
]

export function Navbar() {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [scrolled,  setScrolled]  = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const isDark = theme === 'dark'

  return (
    <>
      <header
        style={{
          borderBottomColor: scrolled ? 'var(--border)' : 'transparent',
          backgroundColor: scrolled ? 'rgba(var(--nav-bg), 0.88)' : 'transparent',
        }}
        className={[
          'fixed top-0 inset-x-0 z-50 h-16',
          'border-b',
          'transition-all duration-300',
          scrolled ? 'backdrop-blur-xl' : '',
        ].join(' ')}
      >
        <div className="section-container h-full flex items-center justify-between gap-6">
          {/* ── Logo ──────────────────────────────────── */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0"
            aria-label="AstroRAG home"
          >
            {/* Mark: four grid squares, opacity cascade */}
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <rect x="1"  y="1"  width="9" height="9" rx="2" fill="var(--accent-2)" fillOpacity="1"   />
              <rect x="12" y="1"  width="9" height="9" rx="2" fill="var(--accent-2)" fillOpacity="0.5" />
              <rect x="1"  y="12" width="9" height="9" rx="2" fill="var(--accent-2)" fillOpacity="0.5" />
              <rect x="12" y="12" width="9" height="9" rx="2" fill="var(--accent-2)" fillOpacity="0.2" />
            </svg>
            <span
              className="text-xl font-display font-bold tracking-tight"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              AstroRAG
            </span>
          </Link>

          {/* ── Desktop nav ───────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Primary navigation">
            {NAV_LINKS.map(link => (
              <NavItem
                key={link.label}
                href={link.href}
                active={pathname === link.href || (link.href === '/rag-demo' && pathname === '/rag-demo')}
              >
                {link.label}
              </NavItem>
            ))}
          </nav>

          {/* ── Desktop actions ────────────────────────── */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="h-9 w-9 flex items-center justify-center rounded-md transition-colors duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Github className="h-4 w-4" />
            </a>

            {/* Theme toggle */}
            <ThemeToggle isDark={isDark} onToggle={toggle} />

            {/* CTA */}
            <Link to="/rag-demo" className="btn-solid text-sm py-2 px-4">
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* ── Mobile controls ───────────────────────── */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle isDark={isDark} onToggle={toggle} />
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="h-9 w-9 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu overlay ─────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex flex-col"
            style={{ background: 'var(--bg-surface)' }}
          >
            {/* Spacer for header */}
            <div className="h-16 shrink-0" />

            <nav className="flex flex-col px-6 pt-8 gap-1" aria-label="Mobile navigation">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={link.href}
                    className="flex items-center justify-between py-4 text-xl font-display font-semibold border-b"
                    style={{
                      color: pathname === link.href ? 'var(--accent-2)' : 'var(--text-primary)',
                      borderColor: 'var(--border)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {link.label}
                    <ArrowRight className="h-5 w-5 opacity-30" />
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="px-6 mt-8">
              <Link to="/rag-demo" className="btn-solid w-full justify-center text-base py-3.5">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function NavItem({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  const shared = {
    className: 'relative px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-100',
    style: { color: active ? 'var(--text-primary)' : 'var(--text-muted)' } as React.CSSProperties,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' },
  }

  const inner = (
    <>
      {children}
      {active && (
        <motion.span
          layoutId="nav-active-indicator"
          className="absolute bottom-0.5 left-3.5 right-3.5 h-0.5 rounded-full"
          style={{ background: 'var(--accent-2)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </>
  )

  if (href.startsWith('http')) {
    return <a href={href} target="_blank" rel="noopener noreferrer" {...shared}>{inner}</a>
  }
  return <Link to={href} {...shared}>{inner}</Link>
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="h-9 w-9 flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Sun className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Moon className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
