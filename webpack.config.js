const HtmlWebpackPlugin = require("html-webpack-plugin");

class ExperimentalPlugin {
  apply(compiler) {
    let resolverPlugin = new ResolverPlugin();
    if (!compiler.options.resolve.plugins) {
      compiler.options.resolve.plugins = [];
    }
    compiler.options.resolve.plugins.push(resolverPlugin);
  }
}

// enhanced-resolve leaves its default hooks at stage 0. The important thing
// here is that we want to put some things earlier and some later than those.
const beforeDefault = -10;
const afterDefaults = 10;

class ResolverPlugin {
  apply(resolver) {
    // raw-resolve -> internal-resolve is the same place in the pipeline that
    // webpack's built-in `resolve.alias` takes effect. It's supposed to take
    // precedence over other resolving decisions.
    resolver
      .getHook("raw-resolve")
      .tapAsync("my-resolver-plugin", async (request, context, callback) => {
        let target = resolver.ensureHook("internal-resolve");
        if (request.request === "#made-up-package") {
          let newRequest = {
            ...request,
            request: "./made-up-package.js",
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
      });

    // described-resolve -> internal-resolve is the same place in the pipeline
    // that webpack's built-in `resolve.fallback` takes effect. It's supposed to
    // only run when the rest of resolving fails to find something.
    resolver.getHook("described-resolve").tapAsync(
      // we need to set the stage here because otherwise we end up before the
      // built-in NextPlugin. Instead we want to behave like the built-in
      // AliasPlugin that implements resolve.fallback -- it comes after
      // NextPlugin.
      { name: "my-resolver-plugin", stage: afterDefaults },
      async (request, context, callback) => {
        let target = resolver.ensureHook("internal-resolve");
        if (request.request.endsWith("1")) {
          let newRequest = {
            ...request,
            request: request.request.replace(/1$/, "2"),
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
  resolve: {
    plugins: [new ResolverPlugin()],
  },
};
