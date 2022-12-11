
var webpack = require('webpack');
var path = require('path');
var libraryName = 'ThreadManager';

const rootPath = path.join(__dirname, '../');

var config =  ({mode,env}) => ({
    mode,
    entry: rootPath + 'src/index.ts',
    devtool: mode  === 'production'? undefined : 'source-map',
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