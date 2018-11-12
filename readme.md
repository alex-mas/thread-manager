# Thread Manager
> Library designed to facilitate using multiple WebWorkers


Thread manager offers features such as a middleware system and different work distribution methods to optimize the load across the pools of workers. It works in web and electron environments.

# Install

```shell
    npm install @axc/thread-manager --save
```


# Use

```javascript

// This example sends 'Hello world' and the worker sends it back to the main script so that its printed

//in your index.js
import {ThreadManager} from '@axc/thread-manager'

const TaskManager = new ThreadManager('./path/to/your/worker/script.js');

TaskManager.setMessageHandler = (e)=>{
    console.log(e.data);
    //yields 'Hello world'
}

TaskManager.sendMessage('Hello world');


//in your worker.js

onmessage = function(e) {
    postMessage(e.data);
}

```

## Documentation

You can check the documentation [here](https://alex-mas.github.io/thread-manager/docs)


