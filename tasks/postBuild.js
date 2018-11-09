const fs = require('fs');





fs.copyFile('./dist/index.d.ts', './index.d.ts',(err)=>{
    if(err){throw err};
});