import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Relative asset URLs work at both an organization Pages root and a project path.
export default defineConfig({
  base: "./", plugins: [react()],
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.endsWith("/src/data/player-portrait-index.json")) return "player-portraits";
    if (id.endsWith("/src/data/team-logos.json")) return "team-logos";
    if (id.includes("/src/data/rosters/") || /\/src\/data\/(?:player-identities|rosters-2011|identity-aliases)\.json$/.test(id)) return "historical-data";
  } } } },
});
