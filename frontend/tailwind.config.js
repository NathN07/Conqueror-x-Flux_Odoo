/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          light: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          muted: '#64748b',
          dark: '#0f172a',
        },
        status: {
          draft: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
          quotation: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
          confirmed: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
          active: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
          paused: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
          closed: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
          paid: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
          cancelled: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
        }
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'card': '0.75rem',
      }
    },
  },
  plugins: [],
}
