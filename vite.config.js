import { defineConfig } from "vite";
import path from "path";

class ExperimentalPlugin {
  async resolveId(source, importer, options) {
    let orig = await this.resolve(source, importer, {
      ...options,
      skipSelf: true,
    });
    if (orig) {
      return orig;
    }
    if (source === "./target-1") {
      this.addWatchFile(path.resolve(__dirname, "src/target-1.js"));
      return this.resolve("./target-2", importer, options);
    }
    return null;
  }
  shouldTransformCachedModule(id) {
    debugger;
  }
}

export default defineConfig({
  plugins: [new ExperimentalPlugin()],
});
