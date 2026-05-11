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
        ink: "#152033",
        mist: "#F3F6FA",
        sand: "#D7DEE8",
        pine: "#0F6B7A",
        ember: "#C94F3D",
        gold: "#F2C744",
        ocean: "#1F77B4",
        plum: "#5B5FC7",
        slateblue: "#4F6173",
        sage: "#D9EEF2",
        apricot: "#FBE4DF",
        lavender: "#E7E8FA",
        skywash: "#DDECF8",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 14px 34px rgba(21, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
