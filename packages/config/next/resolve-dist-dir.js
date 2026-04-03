function resolveDistDir() {
  return process.env.NODE_ENV === "development" ? ".next-dev" : ".next";
}

module.exports = { resolveDistDir };
