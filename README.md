Testing webpack plugin behavior in isolation, in preparation for doing a custom
resolver plugin for embroider.

- [x] aliasing before default resolving
- [x] aliasing after default resolving fails
- [x] aliasing to a virtual module (should be easy to copy what unplugin is doing)
- [ ] can we tell when all consumers of a missing module are dynamic? (so we can insert a runtime error instead of letting webpack blow up)
- [ ] can we alias not the name but the importer?
  - this is what we're really doing for the activeAddons set and virtual peer deps. Better to leave the actual resolving to webpack and just change the importer.
  - this is also what we're doing for app tree merging,
- [ ] generalize my example so the same rules apply in webpack and vite
  - this gives us a nice general-purpose resolver API that's callable from both
