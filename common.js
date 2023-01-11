const path = require("path");

/*
  Establishing common API for customize resolving.

  Both hooks have the same signature and can return
   - undefined to not handle a request at all
   - `{ alias }` to redirect resolving toward a different importPath and/or fromFile
   - `{ virtual }` to provide a module on the fly
*/

exports.Resolver = class Resolver {
  beforeResolve(original, fromFile) {
    // demonstrate priority aliasing
    if (original === "#made-up-package") {
      return {
        alias: {
          importPath: "./made-up-package.js",
          fromFile,
        },
      };
    }

    // demonstrate emitting virtual modules (which will be our solution for
    // externals)
    if (original === "my-virtual-package") {
      return {
        virtual: {
          filename: "virtual-stuff/index.js",
          content: 'export const stuff = "this is the stuff"',
        },
      };
    }

    // demonstrate resolving from an alternate location
    if (original === "co" && fromFile === path.resolve(__dirname, "src")) {
      return {
        alias: {
          importPath: original,
          fromFile: path.resolve(__dirname, "../embroider/package.json"),
        },
      };
    }
  }

  fallbackResolve(original, fromFile) {
    // demonstrate fallback aliasing
    if (original.endsWith("1")) {
      return {
        alias: {
          importPath: original.replace(/1$/, "2"),
          fromFile,
        },
      };
    }
  }
};
