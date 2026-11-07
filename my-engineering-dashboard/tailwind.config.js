import plugin from 'tailwindcss/plugin'

const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // A larger type scale than Tailwind's default (xs 12px -> 14px, sm 14 -> 16, base 16 -> 17, ...).
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.3rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        base: ['1.0625rem', { lineHeight: '1.65rem' }],
        lg: ['1.25rem', { lineHeight: '1.8rem' }],
        xl: ['1.4375rem', { lineHeight: '1.95rem' }],
        '2xl': ['1.75rem', { lineHeight: '2.2rem' }],
        '3xl': ['2.125rem', { lineHeight: '2.5rem' }],
        '4xl': ['2.5rem', { lineHeight: '2.8rem' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      // Palette tokens are defined in src/index.css (light on :root, dark on .dark).
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        sunken: token('sunken'),
        ink: token('text'),
        'ink-2': token('text-2'),
        muted: token('muted'),
        line: token('border'),
        'line-control': token('border-control'),
        primary: token('primary'),
        'primary-hover': token('primary-hover'),
        'on-primary': token('on-primary'),
        accent: token('accent'),
        focus: token('focus'),
        stripe: token('stripe'),
        nav: token('nav'),
        'nav-2': token('nav-2'),
        'on-nav': token('on-nav'),
        'nav-deep': token('nav-deep'),
        tint: token('tint'),
        violet: token('violet'),
        cyan: token('cyan'),
        success: token('success'),
        warning: token('warning'),
        error: token('error'),
      },
      keyframes: {
        'fade-in-up': {
            '0%': { opacity: '0', transform: 'translateY(15px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    }
  },
  plugins: [
    // `wide:` applies when the enclosing CalculatorFrame is wide enough for a side-by-side layout,
    // so calculators adapt to the space the shell leaves them rather than to the viewport.
    plugin(({ addVariant }) => addVariant('wide', '.is-wide &')),
  ],
}
