module.exports = {
    projects: [
        // 1. Node.js Unit Tests (Business Logic)
        {
            displayName: 'unit-logic',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/unit/**/*.spec.ts', '!<rootDir>/tests/unit/components/**'],
            preset: 'ts-jest',
            globals: {
                'ts-jest': {
                    tsconfig: {
                        module: 'commonjs',   // ✅ Nur für Tests!
                        esModuleInterop: true
                    }
                }
            }
        },
        
        // 2. Vue Component Unit Tests
        {
            displayName: 'unit-vue',
            testEnvironment: 'jsdom',
            testMatch: ['<rootDir>/tests/unit/components/**/*.spec.ts'],
            preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel'
        }
        
        // 3. Browser XSLT Tests --> Playwright without jest
    ]
};