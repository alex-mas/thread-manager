# Thread Manager
> Library designed to facilitate using multiple WebWorkers


Thread manager implements a simple api that builds on top of javascript WebWorkers to allow things such as middleware and work distribution.

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

You can check the documentation of [here](https://alex-mas.github.io/thread-manager/)