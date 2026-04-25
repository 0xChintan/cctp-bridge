/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS-variable colors with <alpha-value> support so opacity modifiers
        // (e.g. text-fg/40) work in both themes.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'input-bg': 'rgb(var(--input-bg) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
