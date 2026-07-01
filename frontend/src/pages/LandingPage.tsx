import { Navbar } from '../components/layout/Navbar'
import { Hero } from '../components/sections/Hero'

/*
 * LandingPage renders completed sections.
 * Each section is added here as it's built — Stats, ComponentGrid,
 * AI Suite, etc. This file is the only composition layer.
 */
export function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />
      <main>
        <Hero />
        {/* Next: <StatsBar /> */}
        {/* Next: <ComponentGrid id="components" /> */}
        {/* Next: <AISuite id="ai-suite" /> */}
      </main>
    </div>
  )
}
