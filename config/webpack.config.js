
var webpack = require('webpack');
var path = require('path');
var libraryName = 'ThreadManager';
var outputFile = libraryName + '.js';

const rootPath = path.join(__dirname, '../');

var config =  env => ({
    entry: rootPath + 'src/threadManager.js',
    devtool: 'source-map',
    output: {
        path: rootPath + 'dist',
        filename: outputFile,
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    module: {
        loaders: [
            {
                test: /(\.jsx|\.js)$/,
                loader: 'babel-loader',
                exclude: /(node_modules|bower_components)/
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'THREADMANAGER_ENV': env.mode
        })
    ]
});

module.exports = config;