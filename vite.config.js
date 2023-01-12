import { defineConfig } from "vite";
import { plugin } from "./rollup-plugin.mjs";

export default defineConfig({
  plugins: [plugin()],
});
