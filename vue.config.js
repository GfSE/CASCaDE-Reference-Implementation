const { defineConfig } = require('@vue/cli-service')
const Components = require('unplugin-vue-components/webpack')

//module.exports = defineConfig({
//  transpileDependencies: true
//})

// This alias allows for runtime compilation of components
module.exports = {
    configureWebpack: {
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm-bundler.js',
      },
    },
    plugins: [
    Components({
        dirs: ["src/components"],
        extensions: ["vue"],
        globs: ["src/components/*.vue"],
        dts: true
    })
  ]
  },
};