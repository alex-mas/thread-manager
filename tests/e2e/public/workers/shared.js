
let globalState = 0;


onconnect = (e) => {
  const port = e.ports[0];
  let localState = [];
  port.addEventListener('message', (e) => {
    const payload = e.data;
    globalState++;
    console.log('Shared working');
    console.log('Shared payload received was: ', payload);
    if (payload === 'message from main thread') {
        localState.push(payload);
        port.postMessage({
          localState,
          globalState
        });
    } else {
      port.postMessage(false);
    }
  });

  port.start(); // Required when using addEventListener. Otherwise called implicitly by onmessage setter.
}
