import { plugin } from "./rollup-plugin.mjs";

export default {
  input: "src/index.js",
  output: {
    file: "dist.js",
    format: "iife",
  },
  plugins: [plugin()],
};
