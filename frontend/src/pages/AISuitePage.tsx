import { Link } from 'react-router-dom'
import { ChevronRight, Brain, Search, Code2, BarChart3, ArrowRight, Sparkles, Wand2 } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'

const FEATURES = [
  {
    icon: Search,
    title: 'Semantic Component Search',
    description: 'Describe what you need in plain English. Our RAG pipeline embeds your query and searches across 42 indexed components using FAISS vector similarity.',
    badge: 'Live',
    href: '/demo',
  },
  {
    icon: Brain,
    title: 'LLM-Powered Recommendations',
    description: 'Groq\'s llama-3.3-70b generates structured recommendations with confidence scores, usage examples, and alternative component suggestions.',
    badge: 'Live',
    href: '/demo',
  },
  {
    icon: Code2,
    title: 'Usage Code Generation',
    description: 'Get production-ready import statements and usage snippets tailored to your specific query context.',
    badge: 'Live',
    href: '/demo',
  },
  {
    icon: BarChart3,
    title: 'Similarity Scoring',
    description: 'Every result comes with a cosine similarity score so you know exactly how well the component matches your description.',
    badge: 'Live',
    href: '/demo',
  },
  {
    icon: Sparkles,
    title: 'Props Intelligence',
    description: 'The AI suggests which props to use and how to configure them based on your specific use case.',
    badge: 'Live',
    href: '/demo',
  },
  {
    icon: Wand2,
    title: 'Alternative Discovery',
    description: 'When multiple components could work, the system surfaces ranked alternatives so you can make an informed choice.',
    badge: 'Live',
    href: '/demo',
  },
]

export function AISuitePage() {
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
              <span style={{ color: 'var(--text-primary)' }}>AI Suite</span>
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
              AI Suite
            </h1>
            <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
              AI-powered features for intelligent component discovery and code generation.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="section-container py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl">
            {FEATURES.map(feature => (
              <Link
                key={feature.title}
                to={feature.href}
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
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent-subtle)' }}
                  >
                    <feature.icon className="h-5 w-5" style={{ color: 'var(--accent-2)' }} />
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      background: 'rgba(16,185,129,0.1)',
                      color: 'var(--success)',
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--success)' }} />
                    {feature.badge}
                  </span>
                </div>

                <h2
                  className="text-base font-semibold mb-2"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                >
                  {feature.title}
                </h2>

                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>

                <span
                  className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: 'var(--accent-2)' }}
                >
                  Try it now <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
