exports.fallback = function fallback(original) {
  if (original.endsWith("1")) {
    return original.replace(/1$/, "2");
  }
};
