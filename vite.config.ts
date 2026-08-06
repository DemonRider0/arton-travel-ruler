import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/arton-travel-ruler/",
  build: {
    rollupOptions: {
      input: {
        panel: resolve(import.meta.dirname, "index.html"),
        background: resolve(import.meta.dirname, "background.html"),
      },
    },
  },
});
