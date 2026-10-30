import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Domänmotorn i ../src är skriven för Node. I webbläsaren ersätts node:crypto av en liten shim
// (randomUUID och SHA-256 för granskningsloggens hashkedja).
// Visningsversionen (VITE_DEMO=1) byggs till en enda HTML-fil som fungerar utan server.
export default defineConfig(() => {
  const demo = process.env.VITE_DEMO === "1";
  return {
    base: demo ? "./" : "/",
    plugins: [react(), ...(demo ? [viteSingleFile()] : [])],
    resolve: { alias: { "node:crypto": fileURLToPath(new URL("./src/shim/crypto.ts", import.meta.url)) } },
    build: demo ? { outDir: "dist-demo", assetsInlineLimit: 100000000, cssCodeSplit: false } : {},
    server: { port: 5174, fs: { allow: [".."] } },
  };
});
