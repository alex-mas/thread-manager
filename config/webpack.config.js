
var webpack = require('webpack');
var path = require('path');
var libraryName = 'ThreadManager';

const rootPath = path.join(__dirname, '../');

var config =  env => ({
    mode: env.NODE_ENV,
    entry: rootPath + 'src/index.ts',
    devtool: 'source-map',
    output: {
        path: rootPath + 'dist',
        filename: 'index.min.js',
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    module: {
        rules: [
            {
                test: /(\.jsx|\.js)$/,
                use: 'babel-loader',
                exclude: /(node_modules)/
            },
            {
                test: /(\.tsx|\.ts)$/,
                use: 'ts-loader',
                exclude: /(node_modules)/
            }
        ]
    }
});

module.exports = config;