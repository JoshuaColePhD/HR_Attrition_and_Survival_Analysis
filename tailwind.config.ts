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
        ink: "#F8FAFC",
        mist: "#0F1F35",
        sand: "#D7E4F7",
        pine: "#183B63",
        ember: "#F4727A",
        gold: "#F6C85F",
        ocean: "#5BC0EB",
        plum: "#9B7EDE",
        slateblue: "#4E79A7",
        sage: "#173C4A",
        apricot: "#3A2132",
        lavender: "#222D55",
        skywash: "#123348",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 18px 40px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
