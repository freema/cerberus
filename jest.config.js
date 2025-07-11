/**
 * Jest configuration
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: ['src/**/*.js', '!**/node_modules/**'],
  testMatch: ['**/tests/**/*.test.js'],
  rootDir: '.',
  verbose: true,
  testTimeout: 30000,
  moduleFileExtensions: ['js', 'json'],
};
