


onmessage = function (payload) {
    const { event, context } = payload.data;
    console.log('Message received from main script');
    console.log('Payload received was: ', payload);
    console.log('context received was: ', context);
    console.log('Event received was: ', event);
    console.log('echoing context back to the main script');
    if (context === 'message from main thread') {
        postMessage(true);
    } else {
        postMessage(false);
    }

}