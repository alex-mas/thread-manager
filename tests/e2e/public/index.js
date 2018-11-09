
let hitCount = 0;
let successfullyPassedContext = true;
let middlewareExecutes = false;
let undefinedVar = false;

const myManager = new ThreadManager.ThreadManager(
    './workers/test.js',
    {
        amountOfWorkers: 10
    },
    (message) => {
        console.log('Obtained a message from the worker thread: ',message);
        hitCount++;
        if(!message.data){
            successfullyPassedContext = false;
        }
    }
);



myManager.use((message, next)=>{
    console.log('calling middleware 1');
    if(!middlewareExecutes) {middlewareExecutes = true;}
    message.data = {
        myNewProp: 'Hello!'
    }
    next();
});



myManager.broadcastMessage('message from main thread');



setTimeout(()=>{

    if(hitCount !== 10){
        document.getElementById('hitCountTest').innerHTML = `❌FAILURE: the event handler should have triggered 10 times, instead it just triggered ${hitCount} times`;
    }else{
        document.getElementById('hitCountTest').innerHTML = `✅SUCCESS: the event handler triggered 10 times`
    }

    if(!successfullyPassedContext){
        document.getElementById('contextTest').innerHTML = `❌FAILURE: the event handler should have passed the context properly to the worker's data property`;
    }else{
        document.getElementById('contextTest').innerHTML = `✅SUCCESS: the worker got the right context`;
    }

    if(!middlewareExecutes){
        document.getElementById('middlewareCallingTest').innerHTML = `❌FAILURE: Middleware was not called`;
    }else{
        document.getElementById('middlewareCallingTest').innerHTML = `✅SUCCESS: Middleware was called`;
    }

}, 5000);





console.log('reached end of script');