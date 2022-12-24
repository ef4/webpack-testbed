const HtmlWebpackPlugin = require("html-webpack-plugin");
const VirtualModulesPlugin = require("webpack-virtual-modules");
const path = require("path");
const { fallback } = require("./common");

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
  }

  _alias(original) {
    // demonstrate priority aliasing
    if (original === "#made-up-package") {
      return "./made-up-package.js";
    }

    // and emitting virtual modules (which will be our solution for externals)
    if (original === "my-virtual-package") {
      this.vfs.writeModule(
        "node_modules/my-virtual-package/index.js",
        'export const stuff = "this is the stuff"'
      );
    }
  }

  // demonstrate resolving *from* a different package than the real one
  _rehome(original, fromPath) {
    if (original === "co" && fromPath === path.resolve(__dirname, "src")) {
      return path.resolve(__dirname, "../embroider");
    }
  }

  apply(resolver) {
    // raw-resolve -> internal-resolve is the same place in the pipeline that
    // webpack's built-in `resolve.alias` takes effect. It's supposed to take
    // precedence over other resolving decisions.
    resolver
      .getHook("raw-resolve")
      .tapAsync("my-resolver-plugin", async (request, context, callback) => {
        let target = resolver.ensureHook("internal-resolve");
        let aliased = this._alias(request.request);
        if (aliased) {
          let newRequest = {
            ...request,
            request: aliased,
            fullySpecified: false,
          };
          resolver.doResolve(
            target,
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
        }

        let rehomed = this._rehome(request.request, request.path);
        if (rehomed) {
          let newRequest = {
            ...request,
            path: rehomed,
          };
          resolver.doResolve(
            target,
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
        }

        callback();
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
        let aliased = fallback(request.request);
        if (aliased) {
          let target = resolver.ensureHook("internal-resolve");
          let newRequest = {
            ...request,
            request: aliased,
            fullySpecified: false,
          };
          resolver.doResolve(
            target,
            newRequest,
            "my experiment",
            context,
            (err, result) => {
              if (err) return callback(err);
              if (result) return callback(null, result);
              return callback();
            }
          );
        } else {
          callback();
        }
      }
    );
  }
}

module.exports = {
  entry: "./src/index.js",
  mode: "development",
  plugins: [new HtmlWebpackPlugin(), new ExperimentalPlugin()],
};
