import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "packages/preview",
  server: { port: 5180, strictPort: false },
  build: { outDir: "../../dist-preview" },
});
