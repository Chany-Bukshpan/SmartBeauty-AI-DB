/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  // כדי לא לשבור את ה־CSS הקיים בפרויקט (preflight של Tailwind עלול לשנות defaultים)
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

