import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#fde8ec",
          rose: "#f9c0cd",
          red: "#ef4452",
          back: "#ef6b78",
          front: "#7aa2f7",
        },
      },
      boxShadow: {
        card: "0 6px 24px -8px rgba(0,0,0,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
