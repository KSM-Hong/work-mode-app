import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
const root = path.resolve(import.meta.dirname, "renderer");
export default defineConfig({
  root, envDir: path.resolve(import.meta.dirname, ".."), base: "./", plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "../src") } },
  build: { outDir: path.resolve(import.meta.dirname, "../dist-electron"), emptyOutDir: true },
});
