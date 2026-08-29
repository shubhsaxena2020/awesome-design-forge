import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev/build config for the interactive preview showroom. The Tailwind v4 plugin
// turns the shadcn utility classes (bg-primary, text-foreground, ...) emitted by
// the component kit into real CSS; the Showroom injects the per-brand theme vars
// at runtime via a <style> element.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
  build: { outDir: "dist-preview" },
});
