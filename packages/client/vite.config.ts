import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), dts()],
  base: process.env.NODE_ENV === "production" ? "" : "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.tsx'),
      name: "@node-observatory/client",
      fileName: (format) => `main.${format}.js`,
      formats: ['es', 'umd'],
    }
  },
  server: {
    proxy: {
      "/observatory-api": {
        target: "http://localhost:9999",
        changeOrigin: true,
      },
    },
  },
});