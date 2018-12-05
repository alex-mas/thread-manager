


onmessage = function (message) {
    const payload = message.data;
    throw new Error(payload);
}