import { dirname } from "path";

/*
  Establishing common API for custom resolving.

  Both hooks have the same signature and can return
   - undefined to not handle a request at all
   - `{ alias }` to redirect resolving toward a different importPath and/or fromFile
    - alias contains one or both of importPath and fromFile (if you leave one off, it retains its original value)
   - `{ virtual }` to provide a module on the fly
*/

export class Resolver {
  async beforeResolve(original, fromFile) {
    // demonstrate priority aliasing
    if (original === "#made-up-package") {
      return {
        alias: {
          importPath: "./made-up-package.js",
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
    if (
      original === "co" &&
      dirname(fromFile) === new URL("src", import.meta.url).pathname
    ) {
      return {
        alias: {
          fromFile: new URL("../embroider/package.json", import.meta.url)
            .pathname,
        },
      };
    }
  }

  async fallbackResolve(original, fromFile) {
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
}
