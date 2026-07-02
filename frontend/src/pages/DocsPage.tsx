import { Link } from 'react-router-dom'
import { ChevronRight, Book, Layers, Cpu, Zap, ArrowRight, Code2, Shield } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'

const SECTIONS = [
  {
    icon: Book,
    title: 'Getting Started',
    description: 'Install AstroRAG, run the offline pipeline, and query your first component in under five minutes.',
    items: ['Installation', 'Quick start', 'Configuration', 'Environment variables'],
  },
  {
    icon: Layers,
    title: 'Component Architecture',
    description: 'Understand the Astro component structure, props interface patterns, slot conventions, and styling approach.',
    items: ['File structure', 'Props patterns', 'Slot conventions', 'CSS custom properties'],
  },
  {
    icon: Cpu,
    title: 'RAG Pipeline',
    description: 'Deep dive into the embedding model, FAISS vector store, retrieval strategy, and LLM generation layer.',
    items: ['Embeddings (MiniLM-L6)', 'FAISS index', 'Retrieval scoring', 'Groq LLM generation'],
  },
  {
    icon: Code2,
    title: 'API Reference',
    description: 'Complete reference for the REST API endpoints — search, component listing, health check, and more.',
    items: ['POST /api/search', 'GET /api/components', 'GET /api/components/:name', 'GET /api/health'],
  },
  {
    icon: Zap,
    title: 'AI Suite',
    description: 'Explore AI-powered features: semantic search, natural-language component discovery, and code generation.',
    items: ['Semantic search', 'Component matching', 'Usage generation', 'Alternative suggestions'],
  },
  {
    icon: Shield,
    title: 'Accessibility',
    description: 'Every component follows WCAG 2.1 AA. Learn about our accessibility testing approach and ARIA patterns.',
    items: ['WCAG 2.1 AA compliance', 'ARIA patterns', 'Keyboard navigation', 'Screen reader support'],
  },
]

export function DocsPage() {
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
              <span style={{ color: 'var(--text-primary)' }}>Documentation</span>
            </nav>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
              }}
            >
              Documentation
            </h1>
            <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
              Everything you need to build with AstroRAG — from quick start to deep dives.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="section-container py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
            {SECTIONS.map(section => (
              <div
                key={section.title}
                className="group rounded-lg border p-6 transition-all duration-150"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
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
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="h-9 w-9 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accent-subtle)' }}
                  >
                    <section.icon className="h-4.5 w-4.5" style={{ color: 'var(--accent-2)' }} />
                  </div>
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                    >
                      {section.title}
                    </h2>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {section.description}
                    </p>
                  </div>
                </div>

                <ul className="space-y-1.5 ml-12">
                  {section.items.map(item => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
