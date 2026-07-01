import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { Check, Copy } from 'lucide-react'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

const codeTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: '#c9d1d9',
    background: 'none',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.7',
  },
  'pre[class*="language-"]': {
    color: '#c9d1d9',
    background: '#0d1117',
    padding: '16px',
    margin: '0',
    overflow: 'auto',
  },
  keyword:      { color: '#ff7b72' },
  string:       { color: '#a5d6ff' },
  comment:      { color: '#8b949e', fontStyle: 'italic' },
  function:     { color: '#d2a8ff' },
  operator:     { color: '#79c0ff' },
  punctuation:  { color: '#c9d1d9' },
  'class-name': { color: '#ffa657' },
  property:     { color: '#79c0ff' },
  tag:          { color: '#7ee787' },
  'attr-name':  { color: '#79c0ff' },
  'attr-value': { color: '#a5d6ff' },
  number:       { color: '#f2cc60' },
  boolean:      { color: '#79c0ff' },
  imports:      { color: '#ff7b72' },
  constant:     { color: '#79c0ff' },
}

function detectLang(code: string, hint?: string) {
  if (hint) return hint
  if (code.trimStart().startsWith('import ')) return 'typescript'
  if (code.trimStart().startsWith('<') || code.trimStart().startsWith('---')) return 'jsx'
  return 'tsx'
}

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  copyable?: boolean
}

export function CodeBlock({ code, language, title, copyable = true }: CodeBlockProps) {
  const { copied, copy } = useCopyToClipboard()
  const lang = detectLang(code, language)

  return (
    <div
      className="rounded overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header bar — always dark to match code surface */}
      <div
        className="flex items-center justify-between px-4 h-9"
        style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}
      >
        <div className="flex items-center gap-2">
          {/* Editor-style window dots */}
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#3d444d' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#3d444d' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#3d444d' }} />
          </span>
          {title && (
            <span
              className="text-xs ml-1"
              style={{ fontFamily: 'var(--font-mono)', color: '#8b949e' }}
            >
              {title}
            </span>
          )}
        </div>

        {copyable && (
          <button
            type="button"
            onClick={() => copy(code)}
            className="flex items-center gap-1.5 h-6 px-2.5 rounded text-xs font-medium transition-all duration-150"
            style={{
              color:       copied ? '#3fb950' : '#8b949e',
              background:  copied ? 'rgba(63,185,80,0.1)' : 'transparent',
              border:      '1px solid',
              borderColor: copied ? 'rgba(63,185,80,0.4)' : '#30363d',
            }}
            onMouseEnter={e => { if (!copied) e.currentTarget.style.color = '#c9d1d9' }}
            onMouseLeave={e => { if (!copied) e.currentTarget.style.color = '#8b949e' }}
            aria-label="Copy code"
          >
            {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
          </button>
        )}
      </div>

      {/* Code surface — always dark regardless of page theme */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={lang}
          style={codeTheme}
          customStyle={{ margin: 0, borderRadius: 0, background: '#0d1117' }}
          wrapLongLines={false}
          PreTag="div"
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
