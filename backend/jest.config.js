export default {
  testEnvironment: "node",

  setupFiles: ["<rootDir>/tests/env.setup.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  testMatch: ["**/tests/**/*.test.js"],

  clearMocks: true,
  testTimeout: 30000,

  collectCoverageFrom: [
    "controllers/**/*.js",
    "middleware/**/*.js",
    "utils/**/*.js",
    "!server.js",
  ],
};
