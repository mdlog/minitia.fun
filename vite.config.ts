import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["minitia.fun", ".minitia.fun"],
    hmr: {
      host: "minitia.fun",
      protocol: "wss",
      clientPort: 443,
    },
  },
  build: {
    // Route-level split via React.lazy ships pages as separate chunks (~4-16KB).
    // Vendor bundle (InterwovenKit + wallet stack) is unavoidable in one chunk
    // because it's loaded synchronously at boot by the Web3Providers.
    chunkSizeWarningLimit: 5000,
  },
});
