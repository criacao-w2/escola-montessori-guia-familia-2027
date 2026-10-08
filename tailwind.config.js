/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--brand-font)"] },
      keyframes: {
        carga: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(300%)" } },
      },
    },
  },
  plugins: [],
};
