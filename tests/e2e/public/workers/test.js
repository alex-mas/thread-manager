


onmessage = function (message) {
    const payload = message.data;
    console.log('Message received from main script');
    console.log('payload received was: ', payload);
    console.log('echoing payload back to the main script');
    if (payload === 'message from main thread') {
        postMessage(payload);
    } else {
        postMessage(false);
    }

}