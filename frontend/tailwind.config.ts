import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    /*
     * Override Tailwind's fontSize defaults with the spec scale.
     * All values in rem; Tailwind's defaults already match — we
     * add explicit line-height tuples and letter-spacing where needed.
     */
    fontSize: {
      xs:   ['0.75rem',  { lineHeight: '1rem' }],
      sm:   ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem',     { lineHeight: '1.6' }],
      lg:   ['1.125rem', { lineHeight: '1.6' }],
      xl:   ['1.25rem',  { lineHeight: '1.4' }],
      '2xl':['1.5rem',   { lineHeight: '1.3' }],
      '3xl':['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      '4xl':['2.25rem',  { lineHeight: '1.15', letterSpacing: '-0.025em' }],
      '5xl':['3rem',     { lineHeight: '1.1',  letterSpacing: '-0.03em' }],
      '6xl':['3.75rem',  { lineHeight: '1.05', letterSpacing: '-0.035em' }],
    },
    extend: {
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      /*
       * Color tokens intentionally left out of Tailwind's palette.
       * We use CSS custom properties (var(--token)) for all semantic
       * colors so that dark/light is a single :root swap.
       * Tailwind utilities are used only for layout, spacing, and
       * structural properties — never for semantic color values.
       */
      keyframes: {
        'blob-drift': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%':      { transform: 'translate(80px, -60px) scale(1.12)' },
          '66%':      { transform: 'translate(-50px, 70px) scale(0.92)' },
        },
        'float-up': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-18px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'chevron-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(6px)' },
        },
      },
      animation: {
        'blob-drift-slow':   'blob-drift 22s ease-in-out infinite',
        'blob-drift-medium': 'blob-drift 17s ease-in-out infinite reverse',
        'blob-drift-fast':   'blob-drift 13s ease-in-out infinite',
        'float-up':          'float-up 5s ease-in-out infinite',
        'fade-up':           'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'chevron-bounce':    'chevron-bounce 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
