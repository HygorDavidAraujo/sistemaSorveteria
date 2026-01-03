/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ice Cream Theme
        primary: {
          50: '#FFF5F7',
          100: '#FFE0E6',
          200: '#FFC0CC',
          300: '#FF9DB3',
          400: '#FF7A99',
          500: '#FF6B9D', // Main
          600: '#E55A8C',
          700: '#CC497B',
          800: '#B2386A',
          900: '#992759',
        },
        secondary: {
          50: '#E0F9F7',
          100: '#B3F1EB',
          200: '#80E9DF',
          300: '#4DE1D3',
          400: '#4ECDC4', // Main
          500: '#3DB5B0',
          600: '#2E9E9A',
          700: '#288885',
          800: '#227370',
          900: '#1C5E5B',
        },
        accent: {
          50: '#FFFEF0',
          100: '#FFFCE0',
          200: '#FFFAC0',
          300: '#FFF8A0',
          400: '#FFE66D', // Main
          500: '#FFD700',
          600: '#E6C200',
          700: '#CCAD00',
          800: '#B39900',
          900: '#998500',
        },
      },
      backgroundColor: {
        gradient: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)',
        'gradient-light': 'linear-gradient(135deg, #FFF5F7 0%, #E0F9F7 100%)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF6B9D 0%, #FF9DB3 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #4ECDC4 0%, #45B7AA 100%)',
        'gradient-accent': 'linear-gradient(135deg, #FFE66D 0%, #FFD700 100%)',
        'gradient-light': 'linear-gradient(135deg, #FFF5F7 0%, #E0F9F7 100%)',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'primary': '0 4px 15px rgba(255, 107, 157, 0.25)',
        'secondary': '0 4px 15px rgba(78, 205, 196, 0.25)',
        'accent': '0 4px 15px rgba(255, 230, 109, 0.25)',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-in': 'slideIn 0.4s ease-out',
        'bounce-soft': 'bounceSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideIn: {
          'from': { transform: 'translateY(10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['13px', '18px'],
        'base': ['14px', '20px'],
        'lg': ['16px', '22px'],
        'xl': ['18px', '24px'],
        '2xl': ['20px', '28px'],
        '3xl': ['24px', '32px'],
        '4xl': ['28px', '36px'],
      },
    },
  },
  plugins: [],
}
