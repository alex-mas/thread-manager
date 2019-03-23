let hitCount = 0;
let successfullyPassedContext = true;
let middlewareExecutes = false;
let undefinedVar = false;
let lastMiddlewareHitCount = 0;
let extraVarPassed = false;
let didFaultyWorkerCrash = false;
let didFaultyWorkerSendCorrectMessage = false;
let transferablesCanBeTransfered = false;
let transferablesCanBeReadInWorker =false;


const myTransferableManager = new ThreadManager.ThreadManager(
    './workers/transferables.js',
    {
        amountOfWorkers:1
    }
)

myTransferableManager.use((message, next) => {
    console.log(message);
    if(message.data === 'success'){
        transferablesCanBeReadInWorker = true;
    }
});

const myTypedArr = new Int8Array([1,2,3,4,5,6,7,8,9,10]);
myTransferableManager.sendMessage(myTypedArr.buffer,[myTypedArr.buffer]);

try{
    myTypedArr.every((num)=>console.log(num));
}catch(e){
    transferablesCanBeTransfered =true;
}

const myErrorManager = new ThreadManager.ThreadManager(
    './workers/crasher.js',
    {
        amountOfWorkers: 1
    }
);


myErrorManager.setErrorHandler(
    /**
    * @param {ErrorEvent} error
    */
    (error) => {
        if(error){
            didFaultyWorkerCrash = true;
        }
        if(error.message === 'Uncaught Error: message from main thread'){
            didFaultyWorkerSendCorrectMessage = true;
        }
    }
)
myErrorManager.broadcastMessage('message from main thread');

const myManager = new ThreadManager.ThreadManager(
    './workers/test.js', {
        amountOfWorkers: 11
    },
    (message, next, extraVar) => {
        console.log("reached the end of execution of middleware and extra var is", extraVar);
        console.log('Obtained a message from the worker thread: ', message);
        hitCount++;
        if (extraVar === "hello world") {
            extraVarPassed = true;
        }

        if (!message.data) {
            successfullyPassedContext = false;
        }
    }
);



myManager.use((message, next) => {
    console.log('calling middleware 1');
    if (!middlewareExecutes) {
        middlewareExecutes = true;
    }
    next();
});

myManager.use((message, next) => {
    console.log('calling last middleware');
    if (hitCount < 5) {
        next();
    }
});

myManager.use((message, next) => {
    lastMiddlewareHitCount++;
    next("hello world");
});

myManager.broadcastMessage('message from main thread');

//if it doesnt terminate correctly tests would fail
myManager.terminate(10);


setTimeout(async() => {

    const testResults = [];

    const asyncManager = new ThreadManager.ThreadManager(
        './workers/identity.js',
        {
            amountOfWorkers:1
        }
    );

    asyncManager.setMessageHandler(()=>undefined);
    const res = await asyncManager.sendMessageAsync(()=>true,'hello world');
    if(res.data === 'hello world'){
        testResults.push(`✅SUCCESS: sendMessageAsync can retrieve the values inside an async function`);
    }else{
        testResults.push(
            `❌FAILURE: the value returned from the promise is ${res} instead of "hello world"`
        );
    }
    if (hitCount !== 5) {
        testResults.push(
            `❌FAILURE: the event handler should have triggered 5 times,instead it just triggered ${hitCount} times`
        );
    } else {
        testResults.push(`✅SUCCESS: the event handler triggered 5 times`)
    }

    if (!successfullyPassedContext) {
        testResults.push(`❌FAILURE: the event handler should have passed the context properly to the worker's data property`);
    } else {
        testResults.push(`✅SUCCESS: the worker got the right context`);
    }

    if (!middlewareExecutes) {
        testResults.push(`❌FAILURE: Middleware was not called`);
    } else {
        testResults.push(`✅SUCCESS: Middleware was called`);
    }


    if (lastMiddlewareHitCount !== 5) {
        testResults.push(`❌FAILURE: the last middleware should only be called 5 times, instead it was called ${lastMiddlewareHitCount} times`)
    } else {
        testResults.push(`✅SUCCESS: the last middleware was called 5 times`)
    }

    if (extraVarPassed) {
        testResults.push(`✅SUCCESS: extra variables are passed successfully to next handlers`)
    } else {
        testResults.push(`❌FAILURE: extra variables not passed to next`);
    }

    
    if (didFaultyWorkerCrash) {
        testResults.push(`✅SUCCESS: faulty worker properly handled by onError function`)
    } else {
        testResults.push(`❌FAILURE: faulty worker wasn't handled by onError function`);
    }

    if (didFaultyWorkerSendCorrectMessage) {
        testResults.push(`✅SUCCESS: faulty worker properly sent expected error message`)
    } else {
        testResults.push(`❌FAILURE: faulty worker didn't send expected error message`);
    }

    if (transferablesCanBeReadInWorker) {
        testResults.push(`✅SUCCESS: Transferables can be read properly once transfered`)
    } else {
        testResults.push(`❌FAILURE: Transferables can't be read properly once transfered`);
    }

    if (transferablesCanBeTransfered) {
        testResults.push(`✅SUCCESS: Transferables can be passed properly`)
    } else {
        testResults.push(`❌FAILURE: Transferables can't be passed properly`);
    }

    testResults.map((result) => {
        const node = document.createElement("div");
        node.innerHTML = result;
        document.getElementById('testResults').appendChild(node);
    });

}, 5000);





console.log('reached end of script');