/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#03061a",
          900: "#060b24",
          850: "#0a1230",
          800: "#0e1838",
          700: "#16224a",
          600: "#22305c",
          500: "#34426f",
        },
        ink: {
          50: "#eef1f8",
          100: "#d9deeb",
          200: "#b7bfd4",
          300: "#939cb6",
          400: "#717a95",
        },
        brand: {
          deep: "#000030",
          navy: "#183078",
          blue: "#3060a8",
          light: "#6f95d6",
        },
        method: {
          heuristics: "#bdb6a8",
          plain: "#E69F00",
          fixed: "#009E73",
          adaptive: "#CC79A7",
          a3: "#E8B9D3",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
};
