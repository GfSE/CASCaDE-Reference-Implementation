const { defineConfig } = require('@vue/cli-service');
const webpack = require('webpack');

module.exports = {
    configureWebpack: {
        resolve: {
            alias: {
                'vue$': 'vue/dist/vue.esm-bundler.js',
            },
            fallback: {
                // Polyfills für Saxon-JS (Node.js core modules)
                path: require.resolve('path-browserify'),
                url: require.resolve('url/'),
                fs: false,  // fs kann nicht im Browser verwendet werden
                stream: require.resolve('stream-browserify'),
                buffer: require.resolve('buffer/'),
                util: require.resolve('util/'),
                assert: require.resolve('assert/'),
                crypto: false,  // Optional: falls benötigt
                http: false,
                https: false,
                os: false,
                zlib: false
            }
        },
        plugins: [
            require('unplugin-vue-components/webpack')({
                dirs: ['src/components'],
                extensions: ['vue'],
                globs: ['src/components/*.vue'],
                dts: true,
            }),
            // Provide global variables für Node.js compatibility
            new webpack.ProvidePlugin({
                process: 'process/browser',
                Buffer: ['buffer', 'Buffer']
            }),
            // Define process.env for browser
            new webpack.DefinePlugin({
                'process.env': JSON.stringify(process.env)
            })
        ],
    },










    devServer: {
        headers: {
            'Content-Security-Policy': [
                "default-src 'none'",
                "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "font-src 'self'",
                "connect-src 'self' ws: http: https:",
                "base-uri 'self'",
                "object-src 'none'",
            ].join('; '),
        },

        historyApiFallback: {
            headers: {
                'Content-Security-Policy': [
                    "default-src 'none'",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data:",
                    "font-src 'self'",
                    "connect-src 'self' ws: http: https:",
                    "base-uri 'self'",
                    "object-src 'none'",
                ].join('; '),
            },
        },
    },


    publicPath: './',
};
