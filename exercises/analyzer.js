const audioCtx = new AudioContext();

const analyser = audioCtx.createAnalyser();
analyser.fftSize = 4096;

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

document.addEventListener('DOMContentLoaded', function() {
    // Get a canvas defined with ID "oscilloscope"
    const canvas = document.getElementById("oscilloscope");
    const canvasCtx = canvas.getContext("2d");

    // Start oscillators on click on play button and start drawing
    playButton = document.getElementById("play");
    playButton.addEventListener('click', function() {
        osc = audioCtx.createOscillator();
        osc2 = audioCtx.createOscillator();
        osc.frequency.value = 1000;
        osc2.frequency.value = 2000;
        osc.connect(audioCtx.destination);
        osc.connect(analyser);
        osc.start();
        osc2.connect(audioCtx.destination);
        osc2.connect(analyser);
        osc2.start();
        draw(canvas);
    })

    // Stop oscillators
    stopButton = document.getElementById("stop");
    stopButton.addEventListener('click', function() {
        osc.stop();
        osc2.stop();
    })
})


// Draw function
function draw(canvas) {
    const canvasCtx = canvas.getContext("2d");
    requestAnimationFrame(() => draw(canvas));

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = "rgb(200 200 200)";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0 0 0)";

    canvasCtx.beginPath();

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
    
        canvasCtx.fillStyle = `rgb(${barHeight + 100} 50 50)`;
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
    
        x += barWidth + 1;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
}
