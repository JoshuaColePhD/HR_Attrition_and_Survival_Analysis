import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        mist: "#F4F6F2",
        sand: "#E6E0D4",
        pine: "#184A45",
        ember: "#B6542F",
        gold: "#B99246",
        ocean: "#2B6F8A",
        plum: "#7A3B69",
        slateblue: "#536B78",
        sage: "#DCE8E2",
        apricot: "#F4E0CC",
        lavender: "#E8DDED",
        skywash: "#DCEAF0",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
