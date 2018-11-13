let hitCount = 0;
let successfullyPassedContext = true;
let middlewareExecutes = false;
let undefinedVar = false;
let lastMiddlewareHitCount = 0;
let extraVarPassed = false;

const myManager = new ThreadManager.ThreadManager(
    './workers/test.js', {
        amountOfWorkers: 11
    },
    (message, next, extraVar) => {
        console.log("reached the end of execution of middleware and extra var is",extraVar);
        console.log('Obtained a message from the worker thread: ', message);
        hitCount++;
        if(extraVar === "hello world"){
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


setTimeout(() => {

    const testResults = [];
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
        testResults.push( `✅SUCCESS: the last middleware was called 5 times`)
    }

    if(extraVarPassed){
        testResults.push( `✅SUCCESS: extra variables are passed successfully to next handlers`)
    }else{
        testResults.push(`❌FAILURE: extra variables not passed to next`);
    }

   
    testResults.map((result) => {
        const node = document.createElement("div");
        node.innerHTML = result;
        document.getElementById('testResults').appendChild(node);
    });

}, 5000);





console.log('reached end of script');