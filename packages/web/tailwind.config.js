import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dragon Red - Primary Color
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#8B1E1E', // Dragon Red
          950: '#7f1d1d',
        },
        // Arcane Blue - Secondary Color
        secondary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#3B6BA5', // Arcane Blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Gold Sigil - Accent Color
        accent: {
          50: '#fefbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#D4AF37', // Gold Sigil
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Elven Leaf - Nature Color
        nature: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#3C6E47', // Elven Leaf
          950: '#052e16',
        },
        // Error - Blood Warning
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#B22222', // Blood Warning
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Success - Potion Green
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#2E8B57', // Potion Green
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Custom grays based on theme
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#C0B9A4', // Stone Gray
          500: '#a8a29e',
          600: '#78716c',
          700: '#57534e',
          800: '#44403c',
          900: '#292524',
          950: '#1c1917',
        },
        // Obsidian and Parchment
        obsidian: '#1E1E1E',
        parchment: '#F5F1E8',
        onyx: '#111111',
        ash: '#666666',
      },
      fontFamily: {
        heading: ['"MedievalSharp"', 'cursive'],
        body: ['"Merriweather"', 'serif'],
      },
    },
  },
  plugins: [forms],
};
