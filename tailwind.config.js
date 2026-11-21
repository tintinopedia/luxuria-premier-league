/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#06080f', 900: '#0b101b', 800: '#121a29', 700: '#1a2336', 600: '#26324b', 500: '#3a4766' },
        gold: { 200: '#ffe4a8', 300: '#ffd479', 400: '#f5b942', 500: '#e0a020' },
        live: '#ff3b5c',
      },
      fontFamily: { display: ['Oswald', 'Inter', 'sans-serif'] },
      keyframes: { pulseDot: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } },
      animation: { pulseDot: 'pulseDot 1.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
