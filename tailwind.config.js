/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#24151d",
        accent: "#d83c86",
        studio: "#fff5fb",
        graphite: "#f7ddea",
        champagne: "#5c3b4b",
        signal: "#8f4a68",
      },
    },
  },
  plugins: [],
};
