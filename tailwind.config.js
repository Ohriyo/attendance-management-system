/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./Frontend/*.html",
    "./Frontend/static/js/*.js",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'nwsus-yellow': '#FACC15',
        brand: {
          yellow: '#FACC15',
          red: '#EF4444',
          dark: '#111827',   
          muted: '#6B7280', 
          bg: '#F3F4F6'     
        }
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}