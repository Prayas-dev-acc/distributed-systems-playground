import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/s1": { target: "http://backend-1:3001", changeOrigin: true, ws: true, rewrite: (p) => p.replace(/^\/s1/, "") },
      "/s2": { target: "http://backend-2:3002", changeOrigin: true, ws: true, rewrite: (p) => p.replace(/^\/s2/, "") },
      "/s3": { target: "http://backend-3:3003", changeOrigin: true, ws: true, rewrite: (p) => p.replace(/^\/s3/, "") },
    },
  },
});
