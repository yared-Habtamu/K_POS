import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "./" : "/",
  server: {
    host: "::",
    port: 7080,
    strictPort: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Alias framer-motion to a local shim to avoid dependency resolution issues
      "framer-motion": path.resolve(
        __dirname,
        "./src/lib/framer-motion-shim.tsx",
      ),
    },
  },
}));
