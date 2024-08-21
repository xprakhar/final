const path = require('node:path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TanStackRouterWebpack = require('@tanstack/router-plugin/webpack').TanStackRouterWebpack

module.exports = {
  entry: './src/main.tsx',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, '../../dist/browser'),
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.jsx', '.js'],
    alias: {

    }
  },
  plugins: [
    new MiniCssExtractPlugin(),
    TanStackRouterWebpack(),
    new HtmlWebpackPlugin({ template: './index.html' })
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/i,
        exclude: /node_modules/,
        use: 'ts-loader'
      },
      {
        test: /\.(?:js|mjs|cjs)$/i,
        exclude: /node_modules/,
        use: [{
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env',
                {
                  targets: {
                    browsers: "last 2 versions"
                  },
                  module: false,
                  loose: false
                }],
              [
                "@babel/preset-react",
                {
                  "throwIfNamespace": true, // defaults to true
                  "runtime": "automatic", // defaults to classic
                  // "importSource": "custom-jsx-library" // defaults to react (only in automatic runtime)
                  "development": true
                }
              ]
            ]
          }
        }]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader"
        ],
      },
    ]
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
}