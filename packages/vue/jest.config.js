module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/tests/**/*.spec.ts'],
    transform: {
        '^.+\\.vue$': '@vue/vue3-jest',
        '^.+\\.tsx?$': 'ts-jest'
    },
    moduleFileExtensions: ['vue', 'ts', 'tsx', 'js', 'jsx', 'json'],
    moduleNameMapper: {
        '^@cascara/common/(.*)$': '<rootDir>/../common/src/$1',
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    globals: {
        'ts-jest': {
            tsconfig: './tsconfig.jest.json',
            isolatedModules: true
        }
    }
};
