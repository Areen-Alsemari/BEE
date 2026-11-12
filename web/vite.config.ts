import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          d3: ["d3"],
          react: ["react", "react-dom", "react-router-dom", "zustand", "framer-motion"],
        },
      },
    },
  },
});
