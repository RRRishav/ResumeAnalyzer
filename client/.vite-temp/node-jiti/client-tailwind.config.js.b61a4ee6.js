"use strict";Object.defineProperty(exports, "__esModule", {value: true});/** @type {import('tailwindcss').Config} */
exports. default = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // NVIDIA-inspired color palette
        primary: {
          50: '#f0f5ff',
          100: '#dfe9ff',
          200: '#c0d9ff',
          300: '#a0c9ff',
          400: '#76aa4a',  // NVIDIA green accent
          500: '#76b900',  // Primary NVIDIA green
          600: '#6ba300',
          700: '#558200',
          800: '#3f5f00',
          900: '#2a4000',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        dark: {
          50: '#f8f8f8',
          100: '#f0f0f0',
          200: '#e8e8e8',
          300: '#d0d0d0',
          400: '#888888',
          500: '#666666',
          600: '#444444',
          700: '#333333',
          800: '#1a1a1a',
          900: '#0a0a0a',
        },
        accent: {
          cyan: '#00d4ff',
          lime: '#76b900',
          gold: '#ffd700',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #76b900 0%, #4a6b00 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%)',
        'gradient-neon': 'linear-gradient(135deg, #76b900 0%, #00d4ff 50%, #76b900 100%)',
        'gradient-premium': 'linear-gradient(180deg, rgba(118, 185, 0, 0.1) 0%, rgba(0, 0, 0, 0.3) 100%)',
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(10px)',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'lg': '0 10px 25px rgba(0, 0, 0, 0.2)',
        'xl': '0 20px 40px rgba(0, 0, 0, 0.25)',
        'glow-sm': '0 0 8px rgba(118, 185, 0, 0.3)',
        'glow': '0 0 16px rgba(118, 185, 0, 0.4)',
        'glow-lg': '0 0 32px rgba(118, 185, 0, 0.5)',
        'glow-cyan': '0 0 16px rgba(0, 212, 255, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.6s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(118, 185, 0, 0.4)' },
          '50%': { boxShadow: '0 0 32px rgba(118, 185, 0, 0.6)' },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '3.5rem' }],
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

 /* v7-0797e7c109218e02 */