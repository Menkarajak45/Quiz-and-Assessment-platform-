/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Baloo 2"', 'cursive', 'sans-serif'],
        body: ['"Nunito"', 'sans-serif'],
      },
      boxShadow: {
        brutal: '4px 4px 0 0 #1e1e1e',
        'brutal-sm': '3px 3px 0 0 #1e1e1e',
        'brutal-lg': '6px 6px 0 0 #1e1e1e',
      },
    },
  },
  plugins: [],
};
