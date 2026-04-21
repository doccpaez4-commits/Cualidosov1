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
        // Paleta académica clara con tonos vinotinto
        vinotinto: {
          50: '#fdf3f5',
          100: '#fbe5e9',
          200: '#f5cdd6',
          300: '#eda4b6',
          400: '#e1728f',
          500: '#cd4569',
          600: '#ad2b4e',
          700: '#8f203d', // Accent
          800: '#771d36', // Accent Dark
          900: '#641b31',
          950: '#380b18',
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
          400: '#e1728f',
          500: '#ad2b4e',
          600: '#8f203d',
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
          general:    '#8f203d', // Vinotinto
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
