# Thread Manager
> Library designed to facilitate orchestrating work across multiple WebWorkers


Thread manager offers the following features on top of the standard Web Workers API: 
- Ability to spawn multiple workers and manage them with a simple api.
- Different work distribution methods to optimize the load across the pools of workers.
- Middleware system 

# Usage

The package is packaged as umd so it can be added to your .html or included for webpack/rollup to handle


## Example

Check /tests/e2e folder for diferent examples, but a simple one would be: 

```javascript

// This example sends 'Hello world' and the worker sends it back to the main script so that its printed

import {ThreadManager} from '@axc/thread-manager'

const TaskManager = new ThreadManager({src: './path/to/your/worker.js', config: {amount: 10}});

TaskManager.setMessageHandler = (e)=>{
    console.log(e.data);
    //yields 'Hello world'
}

//triggers setMessageHandler once
TaskManager.sendMessage('Hello World');

//triggers setMessageHandler ten times
TaskManager.broadcast('Hello World')


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

For more information, check [mdn Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) since most functionality here just wraps what is ofered by the Worker and SharedWorker objects.

