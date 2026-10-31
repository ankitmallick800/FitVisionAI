/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D0F",
        surface: "#15191D",
        surface2: "#1C2228",
        line: "#2A3138",
        lime: "#B8FF3B",
        ink: "#F5F7FA",
        mute: "#9CA3AF",
        danger: "#FF5C5C",
        amber: "#F5C16C",
      },
      fontFamily: {
        sans: ["Outfit", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 12px 40px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
};
