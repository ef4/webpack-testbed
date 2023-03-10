import HtmlWebpackPlugin from "html-webpack-plugin";
import VirtualModulesPlugin from "webpack-virtual-modules";
import { Resolver } from "./common.mjs";
import { dirname } from "path";

class ExperimentalPlugin {
  apply(compiler) {
    if (!compiler.options.resolve.plugins) {
      compiler.options.resolve.plugins = [];
    }

    let vfs = compiler.options.plugins.find(
      (i) => i instanceof VirtualModulesPlugin
    );
    if (!vfs) {
      vfs = new VirtualModulesPlugin();
      compiler.options.plugins.push(vfs);
    }

    let resolverPlugin = new ResolverPlugin(vfs);
    compiler.options.resolve.plugins.push(resolverPlugin);
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
