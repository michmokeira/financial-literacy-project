/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.{js,html}"
  ],
  safelist: [
    // Role-based colors
    'bg-green-100',
    'text-green-800',
    'bg-red-100',
    'text-red-800',
    'bg-pink-100',
    'text-pink-800',
    // Like button states
    'bg-pink-50',
    'text-pink-600',
    'border-pink-200',
    'bg-white',
    'text-gray-600',
    'border-gray-200',
    'hover:bg-gray-50',
    // Icons
    'fas',
    'far',
    'fa-heart',
    'fa-certificate',
    'fa-shield',
    'fa-user'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#60A5FA'
        },
        secondary: {
          DEFAULT: '#059669',
          dark: '#047857',
          light: '#34D399'
        }
      }
    },
  },
  plugins: [],
}

