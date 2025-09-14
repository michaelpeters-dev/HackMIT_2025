// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",   // ← add this
  ],
  theme: {
    extend: {
      // map Tailwind fonts to your CSS vars (see step 2)
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      /* …your existing extend (colors, keyframes, etc.) … */
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
