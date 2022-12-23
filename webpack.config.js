const HtmlWebpackPlugin = require("html-webpack-plugin");

class ExperimentalPlugin {
  apply(compiler) {
    // let resolverPlugin = new ResolverPlugin();
    // if (!compiler.options.resolve.plugins) {
    //   compiler.options.resolve.plugins = [];
    // }
    // compiler.options.resolve.plugins.push(resolverPlugin);
    // compiler.hooks.afterResolvers.tap("my-experiment", () => {
    //   console.log(compiler);
    //   debugger;
    // });
  }
}

// enhanced-resolve leaves its default hooks at stage 0. The important thing
// here is that we want to later than those.
const afterDefaults = 10;

class ResolverPlugin {
  apply(resolver) {
    // resolver
    //   .getHook("raw-resolve")
    //   .tapAsync("my-resolver-plugin", async (request, context, cb) => {
    //     console.log(`alias ${request.request}`);
    //     let target = resolver.ensureHook("internal-resolve");
    //     cb();
    //   });

    resolver
      .getHook("described-resolve")
      .tapAsync(
        { name: "my-resolver-plugin", stage: afterDefaults },
        async (request, context, callback) => {
          console.log(`fallback ${request.request}`);
          let target = resolver.ensureHook("internal-resolve");
          if (request.request.endsWith("1")) {
            let newRequest = {
              ...request,
              request: request.request.replace(/1$/, "2"),
              fullSpecifier: false,
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
    // fallback: {
    //   "./target-1": "./target-2",
    // },
  },
};
