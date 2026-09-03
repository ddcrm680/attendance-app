import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f1fb',
          600: '#185fa5',
          700: '#0c447c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
