import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { HomePage   } from './pages/HomePage'
import { ComponentsPage } from './pages/ComponentsPage'
import { ComponentDetailPage } from './pages/ComponentDetailPage'
import { DocsPage } from './pages/DocsPage'
import { AISuitePage } from './pages/AISuitePage'
import { NotFoundPage } from './pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: 1, staleTime: 1000 * 60 * 5 },
    mutations: { retry: 0 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<LandingPage />} />
          <Route path="/demo"            element={<HomePage />} />
          <Route path="/components"      element={<ComponentsPage />} />
          <Route path="/components/:id"  element={<ComponentDetailPage />} />
          <Route path="/docs"            element={<DocsPage />} />
          <Route path="/ai-suite"        element={<AISuitePage />} />
          <Route path="*"               element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
