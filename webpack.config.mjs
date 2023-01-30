import HtmlWebpackPlugin from "html-webpack-plugin";
import { Resolver } from "./common.mjs";
import { dirname } from "path";

// WIP notes:
//
// Assuming the new nmf resolve hook tap-wrapping works
//  - we might now need the beforeResolve tap, since we control the whole
//    lifecycle with one tap

function ourVirtualLoader() {
  let filename = this.loaders[this.loaderIndex].options;
  return Resolver.virtualContent(filename);
}
// webpack can't use real ESM loaders and we have no build tooling in this demo
// repo
globalThis.ourVirtualLoader = ourVirtualLoader;

class ExperimentalPlugin {
  constructor() {
    this.resolver = new Resolver();
  }

  // NEXT: this will need to tell us if it actually changed anything, because in
  // the fallback case we need to decide whether to loop around
  #handle(result, state) {
    if (!result) {
      return;
    }

    if ("alias" in result) {
      state.request = result.alias.importPath;
      if (result.alias.fromFile) {
        state.contextInfo.issuer = result.alias.fromFile;
        state.context = dirname(result.rehome.fromFile);
      }
    } else if ("rehome" in result) {
      state.contextInfo.issuer = result.rehome.fromFile;
      state.context = dirname(result.rehome.fromFile);
    } else if ("virtual" in result) {
      state.request = `our-virtual-loader?${result.virtual.filename}!`;
    } else {
      throw new Error(`bug: unexpected result ${Object.keys(result)}`);
    }
  }

  // this hook can return false to ignore the entire request and otherwise
  // should mutate its input
  #beforeResolve(state) {
    if (!state.request && state.contextInfo.issuer) {
      return;
    }
    this.#handle(
      this.resolver.beforeResolve(state.request, state.contextInfo.issuer),
      state
    );
  }

  #resolve(defaultResolve, state, callback) {
    let { request } = state;
    defaultResolve(state, (err, result) => {
      if (err) {
        // NEXT call resolver.fallbackResolve here, and if it gets results loop
        // back to try to the defaultResolve with them.
        console.log(`SAW ERROR for ${request}`);
        callback(err);
      } else {
        callback(null, result);
      }
    });
  }

  apply(compiler) {
    if (!compiler.options.resolveLoader) {
      compiler.options.resolveLoader = {};
    }
    if (!compiler.options.resolveLoader.alias) {
      compiler.options.resolveLoader.alias = {};
    }
    compiler.options.resolveLoader.alias["our-virtual-loader"] = new URL(
      "./webpack-virtual-loader",
      import.meta.url
    ).href.slice("file://".length);
    compiler.hooks.normalModuleFactory.tap("my-experiment", (nmf) => {
      nmf.hooks.beforeResolve.tap(
        "my-experiment",
        this.#beforeResolve.bind(this)
      );

      // Despite being absolutely riddled with way-too-powerful tap points,
      // webpack still doesn't succeed in making it possible to provide a
      // fallback to the default resolve hook in the NormalModuleFactory. So
      // instead we will find the default behavior and call it from our own tap,
      // giving us a chance to handle its failures.
      let { fn: defaultResolve } = nmf.hooks.resolve.taps.find(
        (t) => t.name === "NormalModuleFactory"
      );

      nmf.hooks.resolve.tapAsync(
        { name: "my-experiment", stage: 50 },
        this.#resolve.bind(this, defaultResolve)
      );
    });
  }
}

class ResolverPlugin {
  constructor(vfs) {
    this.vfs = vfs;
    this.resolver = new Resolver();
  }

  #resolve(result, resolver, request, context, callback) {
    if (!result) {
      callback();
      return;
    }

    if ("virtual" in result) {
      this.vfs.writeModule(
        `node_modules/${result.virtual.filename}`,
        result.virtual.content
      );
      result = {
        alias: {
          importPath: result.virtual.filename,
          fromFile: request.path,
        },
      };
    }

    if ("alias" in result) {
      let newRequest = {
        request: result.alias.importPath ?? request.request,
        path: result.alias.fromFile
          ? dirname(result.alias.fromFile)
          : request.path,
        fullySpecified: false,
        context: {
          issuer: result.alias.fromFile ?? request.context.issuer,
        },
      };
      resolver.doResolve(
        resolver.ensureHook("internal-resolve"),
        newRequest,
        "my experiment",
        context,
        (err, result) => {
          if (err) return callback(err);
          if (result) return callback(null, result);
          return callback();
        }
      );
      return;
    } else {
      throw new Error(`bug: unexpected result ${result}`);
    }
  }

  apply(resolver) {
    // raw-resolve -> internal-resolve is the same place in the pipeline that
    // webpack's built-in `resolve.alias` takes effect. It's supposed to take
    // precedence over other resolving decisions.
    resolver
      .getHook("raw-resolve")
      .tapAsync("my-resolver-plugin", async (request, context, callback) => {
        let result = await this.resolver.beforeResolve(
          request.request,
          request.context.issuer === "" ? undefined : request.context.issuer
        );
        this.#resolve(result, resolver, request, context, callback);
      });

    // described-resolve -> internal-resolve is the same place in the pipeline
    // that webpack's built-in `resolve.fallback` takes effect. It's supposed to
    // only run when the rest of resolving fails to find something.
    resolver.getHook("described-resolve").tapAsync(
      // we need to set the stage here because otherwise we end up before the
      // built-in NextPlugin. Instead we want to behave like the built-in
      // AliasPlugin that implements resolve.fallback -- it comes after
      // NextPlugin.
      //
      // The number just needs to be greater than zero to come after the
      // defaults (tapable assigned them stage 0 by default).
      { name: "my-resolver-plugin", stage: 10 },
      async (request, context, callback) => {
        let result = await this.resolver.fallbackResolve(
          request.request,
          request.context.issuer === "" ? undefined : request.context.issuer
        );
        this.#resolve(result, resolver, request, context, callback);
      }
    );
  }
}

export default {
  entry: "./src/index.js",
  mode: "development",
  plugins: [new HtmlWebpackPlugin(), new ExperimentalPlugin()],
};
