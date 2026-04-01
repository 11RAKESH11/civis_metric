/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
        display: ['Montserrat', 'sans-serif'],
      },
      colors: {
        dashboard: '#09090b', 
        lightdash: '#f8fafc',
        cardDark: '#18181b',
        borderDark: '#27272a',
        accentStart: '#06b6d4',
        accentEnd: '#6366f1',   
      },
      boxShadow: {
        'premium-dark': '0 10px 40px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        'premium-light': '0 10px 40px -10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
        'glow-accent': '0 0 20px -5px rgba(6, 182, 212, 0.4)',
      },
      keyframes: {
        'fade-in-up': {
            '0%': { opacity: '0', transform: 'translateY(15px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scan-line': {
            '0%': { transform: 'translateY(-100%)' },
            '100%': { transform: 'translateY(400%)' },
        },
        'loading-bar': {
            '0%': { width: '0%' },
            '20%': { width: '40%' },
            '60%': { width: '70%' },
            '100%': { width: '100%' },
        },
        'shimmer-glass': {
            '0%': { transform: 'translateX(-150%) skewX(-15deg)' },
            '100%': { transform: 'translateX(150%) skewX(-15deg)' }
        },
        'roof-flash': {
            '0%, 100%': { filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.6)) drop-shadow(0 0 0px rgba(34,211,238,0))' },
            '75%': { filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.6)) drop-shadow(0 0 25px rgba(34,211,238,0.8))' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scan-line': 'scan-line 3s linear infinite',
        'loading-bar': 'loading-bar 3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'shimmer-glass': 'shimmer-glass 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'roof-flash': 'roof-flash 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }
    }
  },
  plugins: [],
}