import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ComponentsPlugin from 'unplugin-vue-components/vite';
import path from 'path';
import type { Plugin } from 'vite';

// Reproduces the Content-Security-Policy headers that vue.config.js used to set
// via devServer.headers / devServer.historyApiFallback.headers for Vue CLI.
function cspHeadersPlugin(): Plugin {
    const csp = [
        "default-src 'none'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' ws: http: https:",
        "base-uri 'self'",
        "object-src 'none'",
    ].join('; ');

    return {
        name: 'cascara-csp-headers',
        configureServer(server) {
            server.middlewares.use((_req, res, next) => {
                res.setHeader('Content-Security-Policy', csp);
                next();
            });
        },
        configurePreviewServer(server) {
            server.middlewares.use((_req, res, next) => {
                res.setHeader('Content-Security-Policy', csp);
                next();
            });
        },
    };
}

export default defineConfig({
    plugins: [
        vue(),
        ComponentsPlugin({
            dirs: ['src/components'],
            extensions: ['vue'],
            globs: ['src/components/*.vue'],
            dts: true,
        }),
        cspHeadersPlugin(),
    ],
    base: './',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@cascara/common': path.resolve(__dirname, '../common/src'),
            // Node core module polyfills, required by saxon-js's Node build
            // being present in the dependency graph's type declarations and by
            // @xmldom/xmldom's Node-only code path in platform-independence.ts.
            path: 'path-browserify',
            stream: 'stream-browserify',
            buffer: 'buffer/',
            util: 'util/',
            assert: 'assert/',
            url: 'url/',
        },
    },
    define: {
        global: 'globalThis',
        'process.env': '{}',
    },
    server: {
        port: 8080,
    },
    build: {
        outDir: 'dist',
    },
});
