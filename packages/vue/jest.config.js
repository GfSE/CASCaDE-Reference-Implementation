module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/tests/**/*.spec.ts'],
    preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
    moduleNameMapper: {
        '^@cascade/common/(.*)$': '<rootDir>/../common/src/$1',
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};
