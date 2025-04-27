import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), dts()],
  base: process.env.NODE_ENV === "production" ? "/static" : "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    manifest: true,
    // lib: {
    //   entry: path.resolve(__dirname, 'src/main.tsx'),
    //   name: "@node-observatory/ui",
    //   fileName: (format) => `main.${format}.js`,
    //   formats: ['es', 'umd'],
    // }
  },
  server: {
    open: 'http://localhost:3000/ui',
    port: 9000,
    proxy: {
      "*": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});