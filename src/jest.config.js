/** @type {import('ts-jest').JestConfigWithTsJest} */
import 'jest-expect-message';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['jest-expect-message'],
};
