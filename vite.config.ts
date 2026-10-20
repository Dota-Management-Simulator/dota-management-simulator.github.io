import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Relative asset URLs work at both an organization Pages root and a project path.
export default defineConfig({ base: "./", plugins: [react()] });
