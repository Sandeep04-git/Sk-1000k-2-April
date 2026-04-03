/**
 * Jest Configuration
 *
 * Primary configuration file for the Jest test runner. Controls test discovery,
 * execution environment, coverage collection, and quality thresholds for the
 * server.js HTTP server application.
 *
 * Usage:
 *   npm test                  — runs all tests with coverage
 *   npx jest --watchAll=false — runs all tests without watch mode
 */
module.exports = {
  // Use Node.js environment (not jsdom) since the server relies on Node.js
  // built-in http module APIs that are unavailable in a browser-like environment
  testEnvironment: 'node',

  // Discover test files matching *.test.js inside __tests__/ directories
  testMatch: ['**/__tests__/**/*.test.js'],

  // Collect coverage only from the server source file to avoid noise from
  // test files, configuration files, and node_modules
  collectCoverageFrom: ['server.js'],

  // Output directory for generated coverage reports (text, lcov, html)
  coverageDirectory: 'coverage',

  // Enforce minimum coverage thresholds — Jest will fail the test run if
  // any metric drops below 90%
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
};
