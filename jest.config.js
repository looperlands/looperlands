module.exports = {
    // Other Jest configurations
    collectCoverage: true,
    coverageReporters: ['text', 'lcov'],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 85,
        lines: 90,
        statements: 90,
      }
    },
    coveragePathIgnorePatterns: ['./shared/js/*']
  };