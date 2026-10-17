/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy surface system
        ink: {
          950: '#070b16',
          900: '#0b1322',
          800: '#0f1a2e',
          700: '#15243d',
          600: '#1c2f4d',
          500: '#26395b',
        },
        // Restrained teal accents
        teal: {
          50: '#eefbf9',
          100: '#d4f5f0',
          200: '#a9eae2',
          300: '#73dad0',
          400: '#3fbfb4',
          500: '#22a499',
          600: '#17857d',
          700: '#146a65',
          800: '#135451',
          900: '#114543',
        },
        // Status colors
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,164,153,0.18), 0 8px 30px -8px rgba(34,164,153,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        pop: '0 12px 40px -12px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'ripple': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'ripple': 'ripple 1.8s ease-out infinite',
        'shimmer': 'shimmer 1.6s infinite',
        'slide-in': 'slide-in 0.35s ease-out both',
      },
      backgroundImage: {
        'navy-radial':
          'radial-gradient(1200px 600px at 75% -10%, rgba(34,164,153,0.10), transparent 60%), radial-gradient(900px 500px at 0% 100%, rgba(34,164,153,0.06), transparent 55%)',
      },
    },
  },
  plugins: [],
};
