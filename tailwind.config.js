/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'animate-firework',
    'animate-result-pulse',
    'firework',
    'resultPulse',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    keyframes: true,
  },
};
