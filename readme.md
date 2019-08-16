# Thread Manager
> Library designed to facilitate using multiple WebWorkers


Thread manager offers features such as a middleware system and different work distribution methods to optimize the load across the pools of workers. It works in web and electron environments.

# Usage

The package is intended to be used in the browser, it is packaged as umd so it can be added to your .html or included for webpack/rollup to handle


## Example


Check /tests/e2e folder for a complete example.


```javascript

// This example sends 'Hello world' and the worker sends it back to the main script so that its printed

import {ThreadManager} from '@axc/thread-manager'

const TaskManager = new ThreadManager('./path/to/your/worker.js');

TaskManager.setMessageHandler = (e)=>{
    console.log(e.data);
    //yields 'Hello world'
}

TaskManager.sendMessage('Hello world');


```

```javascript
// ./path/to/your/worker.js

onmessage = function (message) {
    //some expensive computation
    postMessage(message.data);
}


```
## Documentation

You can check the documentation [here](https://alex-mas.github.io/thread-manager/classes/_index_.threadmanager.html)


