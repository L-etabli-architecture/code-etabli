import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  testMatch: ['**/__tests__/**/*.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.d.ts',
  ],
}

export default config
