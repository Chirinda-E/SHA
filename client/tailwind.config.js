/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#16A34A',
          dark: '#15803D',
          light: '#DCFCE7',
        },
        ink: '#14532D',
        paper: '#F7F4EE',
        warn: '#D97706',
        danger: '#DC2626',
      },
      boxShadow: {
        card: '0 8px 24px rgba(20, 83, 45, 0.08)',
      },
    },
  },
  plugins: [],
};
