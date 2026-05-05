import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        vib: {
          blue: {
            50: '#EEF2FF',
            100: '#E0E7FF',
            200: '#C7D2FE',
            300: '#A5B4FC',
            400: '#818CF8',
            500: '#6366F1',
            600: '#4F46E5',
            700: '#4338CA',
            800: '#3730A3',
            900: '#312E81',
            950: '#1E1B4B',
          },
          indigo: {
            50: '#F0F0FF', 100: '#E0DFFF', 200: '#C4C1FF',
            300: '#A5A0FF', 400: '#8B83FF', 500: '#7366FF',
            600: '#5A4FFF', 700: '#4A3FCC', 800: '#3A3099',
            900: '#2A2266', 950: '#1A1533',
          },
          cyan: {
            50: '#ECFEFF', 100: '#CFFAFE', 200: '#A5F3FC',
            300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4',
            600: '#0891B2', 700: '#0E7490', 800: '#155E75',
            900: '#164E63', 950: '#083344',
          },
          purple: {
            50: '#FAF5FF', 100: '#F3E8FF', 200: '#E9D5FF',
            300: '#D8B4FE', 400: '#C084FC', 500: '#A855F7',
            600: '#9333EA', 700: '#7E22CE', 800: '#6B21A8',
            900: '#581C87', 950: '#3B0764',
          },
          gray: {
            50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0',
            300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B',
            600: '#475569', 700: '#334155', 800: '#1E293B',
            900: '#0F172A', 950: '#020617',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
        display: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'vib-xs': ['0.75rem', { lineHeight: '1rem' }],
        'vib-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'vib-base': ['1rem', { lineHeight: '1.5rem' }],
        'vib-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'vib-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'vib-2xl': ['1.5rem', { lineHeight: '2rem' }],
        'vib-3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        'vib-4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        'vib-5xl': ['3rem', { lineHeight: '1.25' }],
      },
      spacing: {
        'vib-0': '0px', 'vib-1': '0.25rem', 'vib-2': '0.5rem',
        'vib-3': '0.75rem', 'vib-4': '1rem', 'vib-5': '1.25rem',
        'vib-6': '1.5rem', 'vib-8': '2rem', 'vib-10': '2.5rem',
        'vib-12': '3rem', 'vib-16': '4rem', 'vib-20': '5rem',
        'vib-24': '6rem',
      },
      borderRadius: {
        'vib-sm': '0.25rem', 'vib-md': '0.5rem', 'vib-lg': '0.75rem',
        'vib-xl': '1rem', 'vib-2xl': '1.5rem', 'vib-3xl': '2rem',
        'vib-full': '9999px',
      },
      boxShadow: {
        'vib-xs': '0 1px 2px rgba(15, 23, 42, 0.05)',
        'vib-sm': '0 1px 3px rgba(15, 23, 42, 0.1), 0 1px 2px rgba(15, 23, 42, 0.06)',
        'vib-md': '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'vib-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
        'vib-xl': '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
      },
      maxWidth: {
        'vib-xs': '20rem', 'vib-sm': '24rem', 'vib-md': '28rem',
        'vib-lg': '32rem', 'vib-xl': '36rem', 'vib-2xl': '42rem',
        'vib-3xl': '48rem', 'vib-4xl': '56rem', 'vib-5xl': '64rem',
        'vib-6xl': '72rem', 'vib-7xl': '80rem',
      },
      transitionTimingFunction: {
        'vib-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'vib-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'vib-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
