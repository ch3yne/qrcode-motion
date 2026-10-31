import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Demo site: npm run dev / npm run build:demo */
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5183, strictPort: true },
  build: { outDir: "demo-dist", emptyOutDir: true },
});
