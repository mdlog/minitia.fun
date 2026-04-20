import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Force `/` (and `/index.html`) to serve explorer.html in dev. Without this
 * plugin Vite's MPA mode happily resolves the sibling index.html so the
 * main Discovery app leaks into the explorer port.
 */
const serveExplorerAsRoot: PluginOption = {
  name: "serve-explorer-as-root",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (!req.url) return next();
      const [pathname] = req.url.split("?");
      if (pathname === "/" || pathname === "/index.html") {
        req.url = "/explorer.html" + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "");
      }
      next();
    });
  },
};

/**
 * Standalone build config for the explorer surface.
 *
 *   npm run dev:explorer   -> serves explorer.html on port 5175 (forced at /)
 *   npm run build:explorer -> writes a separate dist-explorer/ with
 *                             explorer.html renamed to index.html so it
 *                             can be deployed as its own site
 *                             (explorer.minitia.fun).
 *
 * Shares all hooks / pages / components with the main app by pointing
 * the same `@/` alias at ./src -- no file duplication.
 */
export default defineConfig({
  plugins: [react(), serveExplorerAsRoot],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5175,
    host: true,
    open: "/explorer.html",
    allowedHosts: ["explorer.minitia.fun", ".minitia.fun"],
    hmr: {
      host: "explorer.minitia.fun",
      protocol: "wss",
      clientPort: 443,
    },
  },
  preview: {
    port: 5175,
    host: true,
  },
  build: {
    outDir: "dist-explorer",
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      input: path.resolve(__dirname, "explorer.html"),
    },
  },
});
