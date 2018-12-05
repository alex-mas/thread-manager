


onmessage = function (message) {
    const payload = new Int8Array(message.data);
    const expected = new Int8Array([1,2,3,4,5,6,7,8,9,10]);
    const match = payload.every((n,i)=>n===expected[i]);
    const testResult = match ? 'success' : 'failure';
    postMessage(testResult);
}