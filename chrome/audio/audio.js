chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message) {
    // Return early if this message isn't meant for the offscreen document.
    if (message.target !== 'offscreen-doc') {
        return;
    }

    // Dispatch the message to an appropriate handler.
    switch (message.type) {
        case 'play-sound':
            await playSound(message.data);
            break;
    }
}

async function playSound(data) {
    try {
        // Error if we received the wrong kind of data.
        if (typeof data !== 'object' || !('audio' in data) || !('volume' in data)) {
            throw new TypeError(
                `Value provided must be an 'object' with 'audio' and 'volume' properties, got '${typeof data}'.`
            );
        }
        // `document.execCommand('copy')` works against the user's selection in a web
        // page. As such, we must insert the string we want to copy to the web page
        // and to select that content in the page before calling `execCommand()`.
        const audioUrl = chrome.runtime.getURL('audio/' + data.audio);
        console.log('Attempting to play audio:', audioUrl);
        let audio = new Audio(audioUrl);
        audio.volume = data.volume;
        console.log('Audio object created, volume set to:', data.volume);
        await audio.play();
        console.log('Audio playback started successfully');
    } catch (error) {
        console.error('Error playing audio:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Audio file:', data?.audio);
        console.error('Volume:', data?.volume);
    }
}
