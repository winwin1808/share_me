import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  root: path.resolve(__dirname, "src/renderer"),
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@renderer": path.resolve(__dirname, "src/renderer/src"),
      "@shared": path.resolve(__dirname, "src/shared")
    }
  }
});
