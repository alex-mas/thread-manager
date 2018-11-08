


onmessage = function (message) {
    const { event, payload } = message.data;
    console.log('Message received from main script');
    console.log('Mesage received was: ', message);
    console.log('payload received was: ', payload);
    console.log('Event received was: ', event);
    console.log('echoing payload back to the main script');
    if (payload === 'message from main thread') {
        postMessage(payload);
    } else {
        postMessage(false);
    }

}