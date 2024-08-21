/** @type {import('tailwindcss').Config} */

const containerQueries = require('@tailwindcss/container-queries');


module.exports = {
  content: [
    './index.html',
    'src/**/*.tsx'
  ],
  theme: {
    extend: {},
  },
  darkMode: 'selector',
  plugins: [
    containerQueries
  ],
}

