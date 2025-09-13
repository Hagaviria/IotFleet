const { pathsToModuleNameMapper } = require('ts-jest');
const { readFileSync } = require('fs');
const { parse } = require('jsonc-parser');

// Read and parse tsconfig.json with comments support
const tsconfigContent = readFileSync('./tsconfig.json', 'utf8');
const { compilerOptions } = parse(tsconfigContent);

module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  setupFiles: ['<rootDir>/src/setup-files.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: 'tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@angular|@ionic|@ngrx|@ngx-translate|@angular-devkit|@angular-builders)',
  ],
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/main.server.ts',
    '!src/server.ts',
    '!src/polyfills.ts',
    '!src/setup-jest.ts',
    '!src/setup-files.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'text-lcov',
    'lcov',
    'html',
    'json',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};
