import { Resolver } from "./common.mjs";

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
        result.alias.fromFile ?? importer,
        {
          ...options,
          skipSelf: true,
        }
      );
    }
  }

  async resolveId(context, source, importer, options) {
    let customized = await this.#resolver.beforeResolve(source, importer);

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

    customized = await this.#resolver.fallbackResolve(source, importer);

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

export function plugin() {
  let instance = new ExperimentalPlugin();
  return {
    resolveId(source, importer, options) {
      return instance.resolveId(this, source, importer, options);
    },
    async load(id) {
      return instance.load(this, id);
    },
  };
}
