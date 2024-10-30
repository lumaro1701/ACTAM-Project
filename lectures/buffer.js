const c = new AudioContext();

function createsANoiseBuffer() {
    [b, audioData] = createEmptyBuffer();

    for(var i=0; i<audioData.length; i++) {
        audioData[i] = Math.random();   
    }
    return b;
}

function createsASineBuffer(f) {
    [b, audioData] = createEmptyBuffer();

    alpha = Math.PI*2*f/c.sampleRate;
    for(var i=0; i<audioData.length; i++) {
        audioData[i] = Math.sin(alpha*i);   
    }
    return b;
}


function createEmptyBuffer() {
    b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    audioData = b.getChannelData(0);
    return [b, audioData]
}

function playBuffer(bufferCreator) {

    b = bufferCreator();
 
    const bs = c.createBufferSource();
    bs.buffer = b;
    bs.connect(c.destination);
    bs.start();

}

function stop() {
    c.suspend();
}