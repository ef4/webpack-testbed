Testing webpack plugin behavior in isolation, in preparation for doing a custom
resolver plugin for embroider.

- [x] aliasing before default resolving
- [x] aliasing after default resolving fails
- [x] aliasing to a virtual module (should be easy to copy what unplugin is doing)
- [ ] can we tell when all consumers of a missing module are dynamic? (so we can insert a runtime error instead of letting webpack blow up)
