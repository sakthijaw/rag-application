import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'

export function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <div
        className="flex flex-col items-center justify-center text-center px-6"
        style={{ paddingTop: '160px' }}
      >
        <span
          className="text-7xl font-bold mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--accent-2)',
            opacity: 0.3,
            letterSpacing: '-0.04em',
          }}
        >
          404
        </span>

        <h1
          className="text-2xl mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 700 }}
        >
          Page not found
        </h1>

        <p className="text-base mb-8 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/"
          className="btn-solid"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  )
}
