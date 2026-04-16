import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ouro premium — usado como cor de destaque/acento
        primary: {
          50:  '#fefef5',
          100: '#fdfbe0',
          200: '#faf5b8',
          300: '#f5e97a',
          400: '#f0d862',  // ouro claro
          500: '#e8c96d',  // ouro principal
          600: '#c9a84c',  // ouro escuro
          700: '#a8852f',
          800: '#8a6a1a',
          900: '#6e520b',
          950: '#3d2e02',
        },
        // Superfícies escuras
        surface: {
          950: '#0a0a0f',  // fundo base (mais escuro que slate-950)
          900: '#0f1420',  // sidebar / header
          800: '#1a2035',  // cards / inputs
          700: '#212840',  // hover / elevated
          600: '#2d3655',  // borders visíveis
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-sm': '0 2px 8px rgba(201,168,76,0.15)',
        'gold':    '0 4px 20px rgba(201,168,76,0.2)',
        'gold-lg': '0 8px 40px rgba(201,168,76,0.25)',
        'dark':    '0 4px 24px rgba(0,0,0,0.5)',
        'dark-lg': '0 8px 48px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'gold-gradient':    'linear-gradient(135deg, #c9a84c 0%, #f0d880 50%, #c9a84c 100%)',
        'gold-subtle':      'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(240,216,128,0.02) 100%)',
        'surface-gradient': 'linear-gradient(180deg, #0f1420 0%, #0a0a0f 100%)',
      },
      borderColor: {
        gold:       'rgba(201,168,76,0.25)',
        'gold-dim': 'rgba(201,168,76,0.12)',
        'gold-bright': 'rgba(240,216,128,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
