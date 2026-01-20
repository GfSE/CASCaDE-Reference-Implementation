const { defineConfig } = require('@vue/cli-service')
const Components = require('unplugin-vue-components/webpack')

module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm-bundler.js',
      },
    },
    plugins: [
      require('unplugin-vue-components/webpack')({
        dirs: ['src/components'],
        extensions: ['vue'],
        globs: ['src/components/*.vue'],
        dts: true,
      }),
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
}
