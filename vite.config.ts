import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

// Chrome extensions don't support crossorigin attributes on local resources.
// Strip them from all HTML files after build.
function stripCrossorigin(): Plugin {
  return {
    name: "strip-crossorigin",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "asset" && file.fileName.endsWith(".html")) {
          file.source = (file.source as string).replace(
            / crossorigin/g,
            ""
          );
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest }), stripCrossorigin()],
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
