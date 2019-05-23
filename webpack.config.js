const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, './dist/'),
    //path: path.join(__dirname, './lib/t'),
    filename: 'bundle.js',
    publicPath: '/dist/'
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: ['file?name=[name].[ext]'],
      },
      /*{
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [{ loader: 'babel-loader' }]
      },*/
      {
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: [{loader: 'ts-loader'}]
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['json', 'javascript', 'typescript']
    }),
  ],
  devServer: { contentBase: './' },
  /*node: {
    fs: 'empty'
  },*/
  /*externals: {
    "react": "React",
    "react-dom": "ReactDOM"
  }
   */
}
