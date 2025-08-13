import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bhcBlue: { DEFAULT: '#0A6ED1', light: '#64B5F6', pale: '#E6F0FA' }
      },
      boxShadow: { bhc: '0 12px 36px rgba(10,110,209,0.35)' }
    }
  },
  plugins: []
};
export default config;
