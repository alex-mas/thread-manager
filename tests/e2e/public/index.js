
let hitCount = 0;
let successfullyPassedContext = true;
let middlewareExecutes = false;
let middlewareCanMutateMessage = false;
let undefinedVar = false;

const myManager = new ThreadManager(
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

myManager.
myManager.use((message)=>{
    console.log('calling middleware 0');
    const dummyVar = message.data.myNewProp;
    if(!dummyVar){
        undefinedVar = true;
    }
});

myManager.use((message)=>{
    console.log('calling middleware 1');
    if(!middlewareExecutes) {middlewareExecutes = true;}
    debugger;
    message.data = {
        myNewProp: 'Hello!'
    }
});

myManager.use((message)=>{
    console.log('calling middleware 2, message is: ',message);
    debugger;
    if(message.data.myNewProp && message.data.myNewProp === 'Hello!'){
        middlewareCanMutateMessage = true;
    }
});


myManager.broadcast('testEvent','message from main thread');



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

    if(!undefinedVar){
        document.getElementById('undefinedTest').innerHTML = `❌FAILURE: myNewProp was already defined in the first middleware`;
    }else{
        document.getElementById('undefinedTest').innerHTML = `✅SUCCESS: myNewProp was not defined in the first middleware`;
    }


    if(!middlewareExecutes){
        document.getElementById('middlewareCallingTest').innerHTML = `❌FAILURE: Middleware was not called`;
    }else{
        document.getElementById('middlewareCallingTest').innerHTML = `✅SUCCESS: Middleware was called`;
    }

    if(!middlewareCanMutateMessage){
        document.getElementById('middlewareMutatingTest').innerHTML = `❌FAILURE: Middleware was not able to bootstrap data into the message`;
    }else{
        document.getElementById('middlewareMutatingTest').innerHTML = `✅SUCCESS: Middleware was able to bootstrap data into the message`;
    }
}, 5000);





console.log('reached end of script');