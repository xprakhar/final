const path = require('node:path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');


module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/main.ts',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../../dist/server')
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {

    }
  },
  externalsPresets: { node: true },
  externals: nodeExternals({
    additionalModuleDirs: [path.resolve(__dirname, '../../node_modules')]
  }),
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  },
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /\.(css | less)$/ }),
    new webpack.BannerPlugin('require("source-map-support").install();',
      { raw: true, entryOnly: false }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ],
  devtool: 'inline-source-map'
}