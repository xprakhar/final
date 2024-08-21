"use strict"

import webpack from 'webpack';
import * as path from 'node:path';
import * as url from 'node:url';
import nodeExternals from 'webpack-node-externals';

const filename = url.fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);


export default {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/main.ts',
  output: {
    filename: '[name].js',
    path: path.resolve(dirname, '../../dist/server')
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {

    }
  },
  externalsPresets: { node: true },
  externals: nodeExternals({
    additionalModuleDirs: [path.resolve(dirname, '../../node_modules')]
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
  ]
}