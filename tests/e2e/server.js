const express = require('express');
const path = require('path');
const fs = require('fs');

fs.mkdirSync('./tests/e2e/public/lib');
fs.copyFileSync('./dist/index.min.js', './tests/e2e/public/lib/threadManager.js');


const app = express();

const PORT = 3000;



app.use(express.static(path.join(__dirname, 'public')));





app.listen(PORT, ()=>{
    console.log('server is listening');
})