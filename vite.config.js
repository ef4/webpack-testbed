import { defineConfig } from "vite";
import { plugin } from "./rollup-plugin";

export default defineConfig({
  plugins: [plugin()],
});
