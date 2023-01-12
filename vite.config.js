import { defineConfig } from "vite";
import { dirname } from "path";
import { Resolver } from "./common";

const VIRTUAL_PREFIX = "\0embroider-virtual/";

class ExperimentalPlugin {
  #resolver = new Resolver();
  #virtualModules = new Map();

  async #handleCustomized(context, source, importer, options, result) {
    if (!result) {
      return null;
    }
    if ("virtual" in result) {
      this.#virtualModules.set(result.virtual.filename, result.virtual.content);
      return VIRTUAL_PREFIX + result.virtual.filename;
    }

    if ("alias" in result) {
      return await context.resolve(
        result.alias.importPath ?? source,
        result.alias.fromDir ? result.alias.fromDir + "/." : importer,
        {
          ...options,
          skipSelf: true,
        }
      );
    }
  }

  async resolveId(context, source, importer, options) {
    let customized = await this.#resolver.beforeResolve(
      source,
      dirname(importer)
    );

    let result = await this.#handleCustomized(
      context,
      source,
      importer,
      options,
      customized
    );

    if (result) {
      return result;
    }

    result = await context.resolve(source, importer, {
      ...options,
      skipSelf: true,
    });
    if (result) {
      return result;
    }

    customized = await this.#resolver.fallbackResolve(
      source,
      dirname(importer)
    );

    result = await this.#handleCustomized(
      context,
      source,
      importer,
      options,
      customized
    );
    if (result) {
      return result;
    }

    return null;
  }

  async load(context, id) {
    if (id.startsWith(VIRTUAL_PREFIX)) {
      let moduleName = id.slice(VIRTUAL_PREFIX.length);
      let contents = this.#virtualModules.get(moduleName);
      if (!contents) {
        throw new Error(`bug: missing virtual module ${moduleName}`);
      }
      return contents;
    }
  }
}

function makePlugin() {
  let plugin = new ExperimentalPlugin();
  return {
    resolveId(source, importer, options) {
      return plugin.resolveId(this, source, importer, options);
    },
    async load(id) {
      return plugin.load(this, id);
    },
  };
}

export default defineConfig({
  plugins: [makePlugin()],
});
