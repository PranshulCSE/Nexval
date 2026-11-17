/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F4F5F9',
        card: '#FFFFFF',
        primary: {
          DEFAULT: '#0F172A', // Dark navy / near-black
          hover: '#1E293B',
          foreground: '#FFFFFF'
        },
        border: {
          DEFAULT: '#E2E8F0', // 1px light gray border
          light: '#F1F5F9'
        },
        muted: {
          DEFAULT: '#64748B',
          light: '#94A3B8'
        },
        badge: {
          yellow: {
            bg: '#FEF9C3',
            text: '#854D0E',
            border: '#FEF08A'
          },
          blue: {
            bg: '#EFF6FF',
            text: '#1E40AF',
            border: '#DBEAFE'
          },
          green: {
            bg: '#F0FDF4',
            text: '#166534',
            border: '#DCFCE7'
          },
          gray: {
            bg: '#F1F5F9',
            text: '#475569',
            border: '#E2E8F0'
          },
          red: {
            bg: '#FEF2F2',
            text: '#991B1B',
            border: '#FEE2E2'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        'xl': '12px',
        'lg': '8px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
