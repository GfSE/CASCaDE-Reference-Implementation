module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.spec.ts'],
    preset: 'ts-jest',
    moduleNameMapper: {
        '^@cascara/common/(.*)$': '<rootDir>/src/$1'
    },
    globals: {
        'ts-jest': {
            tsconfig: './tsconfig.jest.json'
        }
    }
};
