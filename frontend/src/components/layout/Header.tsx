import { Moon, Sun } from 'lucide-react'

interface HeaderProps {
  theme: string
  onToggleTheme: () => void
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-zinc-800 bg-[#0c0c0d]">
      {/* Left — brand */}
      <div className="flex items-center gap-2.5">
        {/* Logotype mark: simple, geometric */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="1" y="1" width="6" height="6" rx="1" fill="#3b82f6" fillOpacity="0.9" />
          <rect x="9" y="1" width="6" height="6" rx="1" fill="#3b82f6" fillOpacity="0.4" />
          <rect x="1" y="9" width="6" height="6" rx="1" fill="#3b82f6" fillOpacity="0.4" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="#3b82f6" fillOpacity="0.2" />
        </svg>
        <span className="text-sm font-medium text-zinc-200 tracking-tight">AstroRAG</span>
        <span className="text-zinc-700 text-sm select-none">·</span>
        <span className="text-xs text-zinc-600">Component Search</span>
      </div>

      {/* Right — meta + controls */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-600">
          <span>42 components</span>
          <span className="text-zinc-800">·</span>
          <span>10 categories</span>
          <span className="text-zinc-800">·</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
            <span>API connected</span>
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        <button
          type="button"
          onClick={onToggleTheme}
          className="h-7 w-7 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun className="h-3.5 w-3.5" />
            : <Moon className="h-3.5 w-3.5" />
          }
        </button>
      </div>
    </header>
  )
}
