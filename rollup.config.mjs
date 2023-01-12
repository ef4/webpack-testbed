import { plugin } from "./rollup-plugin.mjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.js",
  output: {
    file: "dist.js",
    format: "iife",
  },
  plugins: [plugin(), nodeResolve()],
};
