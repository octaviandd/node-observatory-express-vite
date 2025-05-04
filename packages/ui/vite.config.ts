import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import dts from 'vite-plugin-dts';
import { ViteEjsPlugin } from "vite-plugin-ejs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), dts(), ViteEjsPlugin()],
  define: {
    'import.meta.env.SERVER_PORT': JSON.stringify(process.env.SERVER_PORT),
    'import.meta.env.BASE_PATH': JSON.stringify(process.env.BASE_PATH)
  },
  base: '/ui/',
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
    open: `http://localhost:${JSON.stringify(process.env.SERVER_PORT)}/ui`,
    port: 5173,
    proxy: {
      "*": {
        target: `http://localhost:${JSON.stringify(process.env.SERVER_PORT)}/ui`,
        changeOrigin: true,
      },
    },
  },
});