import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two pages: the main site and the scroll-flip magazine
export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, "index.html"), magazine: resolve(import.meta.dirname, "magazine.html") },
    },
  },
});
