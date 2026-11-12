/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        sunken: token("sunken"),
        hover: token("hover"),
        selected: token("selected"),
        line: { DEFAULT: token("line"), strong: token("line-strong") },
        fg: { DEFAULT: token("fg"), 2: token("fg-2") },
        muted: token("muted"),
        brand: { DEFAULT: token("brand"), 2: token("brand-2"), tint: token("brand-tint") },
        focus: token("focus"),
        ok: { fg: token("ok-fg"), bg: token("ok-bg") },
        danger: { fg: token("danger-fg"), bg: token("danger-bg") },
        warn: { fg: token("warn-fg"), bg: token("warn-bg") },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.75rem", { lineHeight: "1.05rem" }],
      },
    },
  },
  plugins: [],
};
