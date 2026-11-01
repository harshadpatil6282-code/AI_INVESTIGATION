/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111b',
        panel: '#102132',
        brass: '#d7a94b',
        teal: '#76d1c5',
      },
      boxShadow: {
        command: '0 20px 45px rgba(4, 11, 20, 0.45)',
      },
    },
  },
  plugins: [],
};
