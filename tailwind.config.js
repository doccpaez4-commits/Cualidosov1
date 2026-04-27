/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Paleta académica profesional en tonos azules
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#38aaf7',
          500: '#0e8de9',
          600: '#026ec7',
          700: '#0358a1', // Accent
          800: '#074a85', // Accent Dark
          900: '#0c3f6e',
          950: '#082849',
        },
        surface: {
          50: '#ffffff',
          100: '#fcfcfc',
          800: '#ffffff', // overrides for clear background
          850: '#fafafa', // subtle inner backgrounds
          900: '#f4f4f5', // panels
          950: '#e4e4e7', // borders
        },
        accent: {
          400: '#38aaf7',
          500: '#026ec7',
          600: '#0358a1',
        },
        teal: {
          400: '#2dd4bf',
          500: '#0f766e', 
        },
        rose: {
          400: '#fb7185',
          500: '#be123c',
        },
        // Dominios Breilh
        breilh: {
          general:    '#0358a1', // Azul Primario
          particular: '#0f766e', // Teal oscuro
          singular:   '#b45309', // Ambar oscuro
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-in-r': 'slideInRight 0.3s ease-out',
        'slide-in-l': 'slideInLeft 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(20px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        slideInLeft:  { from: { transform: 'translateX(-20px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        pulseSoft:    { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
