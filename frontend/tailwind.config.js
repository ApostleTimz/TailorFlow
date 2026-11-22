export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        espresso: { DEFAULT: '#2b1b14', 600: '#4a3328', 700: '#3a281e' },
        ivory: { DEFAULT: '#f6efe2', 200: '#ebe1cf', 300: '#d9ccb2' },
        bronze: { DEFAULT: '#a67c52', 300: '#c9a275', 700: '#74522e' },
        charcoal: { DEFAULT: '#34322f', 700: '#2a2826' },
      },
      fontFamily: { serif: ['Fraunces', 'Georgia', 'serif'], sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
