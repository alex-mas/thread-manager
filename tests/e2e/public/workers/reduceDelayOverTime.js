



let delay = 5000;

let i = 0;

onmessage = function (message) {
    setTimeout(()=>{
        postMessage({
            data: message.data,
            id: i
        });
        delay -=500;
        if(delay <= 0){
            delay = 5000;
        }
        i++;
    }, delay);
}