Testing webpack plugin behavior in isolation, in preparation for doing a custom
resolver plugin for embroider.

- [x] aliasing before default resolving
- [x] aliasing after default resolving fails
- [x] aliasing to a virtual module (should be easy to copy what unplugin is doing)
- [x] can we alias not the name but the importer?
  - this is what we're really doing for the activeAddons set and virtual peer deps. Better to leave the actual resolving to webpack and just change the importer.
  - this is also what we're doing for app tree merging,
- [x] start adding vite too
- [x] continue moving the policy code from webpack.config.js to common.js
- [x] implement all the policy code in vite

Nice to have, but seems unlikely without core feature support in webpack:

- [ ] can we tell when all consumers of a missing module are dynamic? (so we can insert a runtime error instead of letting webpack blow up)
- [ ] when a real file is added that would invalidate a previous fallback
      decision, vite doesn't rebuild and addWatchFile doesn't seem to care about
      file creation. It still gets things right whenever the next build is triggered
      though.
