import "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"


//Waiting for the HTML content to be loaded
document.addEventListener('DOMContentLoaded', function() {

    const tempoSlider = document.getElementById("tempo-slider");
    tempoSlider.addEventListener('input', (e) => {
      const tempo = parseInt(e.target.value);
      Tone.Transport.bpm.value = tempo;
      bpmDisplay.textContent = `${tempo} BPM`;
  });

    const playIntroBtn = document.getElementById("play-intro");
    playIntroBtn.addEventListener('click', function() {
        playIntro(tempoSlider, 0)
    })
    
    const playBuildupBtn = document.getElementById("play-buildup");
    playBuildupBtn.addEventListener('click', function() {
        playBuildup(tempoSlider, 0)
    })
    
    const playDropBtn = document.getElementById("play-drop");
    playDropBtn.addEventListener('click', function() {
        playDrop(tempoSlider, 0)
    })
    
    const playOutroBtn = document.getElementById("play-outro");
    playOutroBtn.addEventListener('click', function() {
        playOutro(tempoSlider, 0)
    })

    const stopBtn = document.getElementById("stop-button");
    stopBtn.addEventListener('click', function() {
        stop()
    })
    
});

//Sequences of notes and chords
const arpSequence = [
    "C5", "D5", "F5", "C5", "D5", "F5", "C5", "D5", 
    "G5", "C5", "D5", "F5", "C5", "D5", "F5", "C5", 
    "D5", "F5", "C5", "D5", "F5", "C5", "D5", "G5", 
    "C5", "D5", "F5", "C5", "D5", "F5", "C5", "D5", 
    "F5", "C5", "D5", "F5", "C5", "D5", "G5", "C5", 
    "D5", "F5", "C5", "D5", "F5", "C5", "D5", "F5",
    "C5", "D5", "G5", "C5", "D5", "A#5", "B#5", "C5",
    "D5", "G5", "C5", "D5", "A#5", "C5", "D5", "F5"]

const bassSequence = [
  "G1", null, "G1", null, "F1", null, "F1", null, "D#1", null, null, "D#1", null, "D#1", null, null,
  "D#1", null, "D#1", null, "F1", null, "F1", null, "C2", null, null, "C2", null, "C2", null, null,
  "C2", null, "C2", null, "D1", null, "D1", null, "D#1", null, null, "D#1", null, "D#1", null, null,
  "D#1", null, "D#1" , null, "F1", null, "F1", null, "G1", null, null, "G1", null, "G1", null, null]

const chordSequence = [
  {"time": "0:0:0", "note": ["G5", "A#5"]},
  {"time": "0:0:1", "note": []},
  {"time": "0:0:2", "note": ["G5", "A#5"]},
  {"time": "0:0:3", "note": []},
  {"time": "0:1:0", "note": ["F5", "A5"]},
  {"time": "0:1:1", "note": []},
  {"time": "0:1:2", "note": ["F5", "A5"]},
  {"time": "0:1:3", "note": []},
  {"time": "0:2:0", "note": ["D5", "G5"]},
  {"time": "0:2:1", "note": []},
  {"time": "0:2:2", "note": []},
  {"time": "0:2:3", "note": ["D5", "G5"]},
  {"time": "0:3:0", "note": []},
  {"time": "0:3:1", "note": ["D5", "G5"]},
  {"time": "0:3:2", "note": []},
  {"time": "0:3:3", "note": []}]



//Creation of synths and effects nodes
const reverb = new Tone.Reverb(2)
reverb.toDestination()

const phaser = new Tone.Phaser()
phaser.toDestination()

const arpSynth = new Tone.Synth({
    oscillator: {
      type: "triangle"
    },
    envelope: {
      attack: 0.001,
      decay: 0.2,
      sustain: 0,
      release: 0.2,
    },
}).toDestination();
arpSynth.connect(reverb)

const bassSynth = new Tone.MonoSynth({
    oscillator : {
    type : "sawtooth"
    },
    filter : {
    Q : 0.5,
    type : "lowpass",
    rolloff : -24
    },
    envelope : {
    attack : 0.005 ,
    decay : 0.6,
    sustain : 0.8,
    release : 0.7
    },
    filterEnvelope : {
    attack : 0.0,
    decay : 0.8,
    sustain : 0.0,
    release : 0.6,
    baseFrequency : 200,
    octaves : 3,
    exponent : 2
    }            
}).toDestination();
bassSynth.connect(phaser)

const chordSynth = new Tone.PolySynth(Tone.Synth).toDestination();
chordSynth.connect(reverb)
chordSynth.set({
    oscillator: {
        type: "sawtooth"
      },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0.3,
        release: 1,
      },
})


//Loading samples
const kick = new Tone.Player("assets/kick.wav").toDestination();
const snare = new Tone.Player("assets/snare.wav").toDestination();
const snareBuildup = new Tone.Player("assets/snare_buildup.wav").toDestination();
const closedHihat = new Tone.Player("assets/closed_hihat.wav").toDestination();
const hihat = new Tone.Player("assets/open_hihat.wav").toDestination();
const hihat2 = new Tone.Player("assets/open_hihat2.wav").toDestination();
hihat.connect(reverb)
snare.connect(reverb)
kick.volume.value = 3
snare.volume.value = 2
hihat2.volume.value = 3

const piano_G = new Tone.Player("assets/piano_G.mp3").toDestination();
piano_G.connect(reverb);
const piano_Asharp = new Tone.Player("assets/piano_A#.mp3").toDestination();
piano_Asharp.connect(reverb);
const piano_F = new Tone.Player("assets/piano_F.mp3").toDestination();
piano_F.connect(reverb);
const piano_A = new Tone.Player("assets/piano_A.mp3").toDestination();
piano_A.connect(reverb);
const piano_D = new Tone.Player("assets/piano_D.mp3").toDestination();
piano_D.connect(reverb);


//Functions to play parts of the music
function playIntro(tempo){
  Tone.Transport.bpm.value = tempo.value;

  const drumsSeq = new Tone.Sequence(
    (time, step) => {
      // For each step, trigger the corresponding drum sound
      if (step % 2 === 0 ) {
        kick.start(time);
      }
      if (step % 4 === 2) {
        snare.start(time);
      }
      if (step % 2 === 0) {
        hihat.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7], "8n")

  const arpSeq = new Tone.Sequence(function(time, note){
    arpSynth.triggerAttackRelease(note, "8n", time);
  }, arpSequence, "16n");

  const pianoSeq = new Tone.Sequence(
    (time, step) => {
      if (step === 0 || step === 2 ) {
        piano_G.start(time);
        piano_Asharp.start(time);
      }
      if (step === 4 || step === 6) {
        piano_F.start(time);
        piano_A.start(time);
      }
      if (step === 8 || step === 11 || step === 13) {
        piano_D.start(time);
        piano_G.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n"
  );

  if (Tone.Transport.state === "started") {
    stop()
  }
  Tone.Transport.start();

  arpSeq.start("8m")
  arpSeq.loop = 4

  pianoSeq.start("16m")
  pianoSeq.loop = 8

  drumsSeq.start(0)
  drumsSeq.loop = 24

}


function playBuildup(tempo){
  Tone.Transport.bpm.value = tempo.value;

  const drumsSeq1 = new Tone.Sequence(
    (time, step) => {
      if (step % 2 === 0 ) {
        snareBuildup.start(time);
        hihat.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7], "8n")

  const drumsSeq2 = new Tone.Sequence(
    (time, step) => {
      snareBuildup.start(time);
      if (step % 2 === 0 ) {
        hihat.start(time);
      }
  }, [0, 1, 2, 3, 4, 5, 6, 7], "8n")

  const drumsSeq3 = new Tone.Sequence(
    (time, step) => {
      snareBuildup.start(time);
      if (step % 4 === 0 ) {
        hihat.start(time);
      }
  }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n")
  
  const arpSeq = new Tone.Sequence(function(time, note){
    arpSynth.triggerAttackRelease(note, "8n", time);
  }, arpSequence, "16n");

  const pianoSeq = new Tone.Sequence(
    (time, step) => {
      if (step === 0 || step === 2 ) {
        piano_G.start(time);
        piano_Asharp.start(time);
      }
      if (step === 4 || step === 6) {
        piano_F.start(time);
        piano_A.start(time);
      }
      if (step === 8 || step === 11 || step === 13) {
        piano_D.start(time);
        piano_G.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n"
  );

  const bassSeq = new Tone.Sequence(function(time, note){
    bassSynth.triggerAttackRelease(note, "16n", time);
  }, bassSequence, "16n");

  if (Tone.Transport.state === "started") {
    stop()
  }
  Tone.Transport.start();

  drumsSeq1.start(0)
  drumsSeq1.loop = 4

  drumsSeq2.start("4m")
  drumsSeq2.loop = 2

  drumsSeq3.start("6m")
  drumsSeq3.loop = 1

  pianoSeq.start(0)
  pianoSeq.loop = 8

  arpSeq.start(0)
  arpSeq.loop = 2

  bassSeq.start(0)
  bassSeq.loop = 2

}


function playDrop(tempo) {
  Tone.Transport.bpm.value = tempo.value;

  const drumsSeq1 = new Tone.Sequence(
    (time, step) => {
      if (step % 2 === 0 ) {
        kick.start(time);
      }
      if (step % 4 === 2) {
        snare.start(time);
      }
      if (step % 2 === 0) {
        hihat.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7], "8n")

  const drumsSeq2 = new Tone.Sequence(
    (time, step) => {
      closedHihat.start(time)
      if (step % 4 === 2){
        hihat2.start(time)
      }
      if (step % 4 === 0 ) {
        kick.start(time);
      }
      if (step % 8 === 4) {
        snare.start(time);
      }
      if (step % 4 === 0) {
        hihat.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n")

  const arpSeq = new Tone.Sequence(function(time, note){
    arpSynth.triggerAttackRelease(note, "8n", time);
  }, arpSequence, "16n");

  const bassSeq = new Tone.Sequence(function(time, note){
    bassSynth.triggerAttackRelease(note, "4n", time);
  }, bassSequence, "16n");

  const chordSeq = new Tone.Part((time, chord) => {
    chordSynth.triggerAttackRelease(chord.note, "8n", time)
  }, chordSequence)

  const pianoSeq = new Tone.Sequence(
    (time, step) => {
      if (step === 0 || step === 2 ) {
        piano_G.start(time);
        piano_Asharp.start(time);
      }
      if (step === 4 || step === 6) {
        piano_F.start(time);
        piano_A.start(time);
      }
      if (step === 8 || step === 11 || step === 13) {
        piano_D.start(time);
        piano_G.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n"
  );

  if (Tone.Transport.state === "started") {
    stop()
  }
  Tone.Transport.start();

  arpSeq.start(0)
  arpSeq.loop = 8

  pianoSeq.start(0)
  pianoSeq.loop = 32

  chordSeq.start(0)
  chordSeq.loop = 32

  drumsSeq1.start(0)
  drumsSeq1.loop = 15

  drumsSeq2.start("16m")
  drumsSeq2.loop = 16

  bassSeq.start(0)
  bassSeq.loop = 8
}

function playOutro(tempo) {
  Tone.Transport.bpm.value = tempo.value;

  const drumsSeq1 = new Tone.Sequence(
    (time, step) => {
      closedHihat.start(time)
      if (step % 4 === 2){
        hihat2.start(time)
      }
      if (step % 4 === 0 ) {
        kick.start(time);
      }
      if (step % 8 === 4) {
        snare.start(time);
      }
      if (step % 4 === 0) {
        hihat.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n")

  const drumsSeq2 = new Tone.Sequence(
    (time, step) => {
      if (step % 2 === 0 ) {
        kick.start(time);
      }
      if (step % 4 === 2) {
        snare.start(time);
      }
      if (step % 2 === 0) {
        hihat.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7], "8n")

  const arpSeq = new Tone.Sequence(function(time, note){
    arpSynth.triggerAttackRelease(note, "8n", time);
  }, arpSequence, "16n");

  const pianoSeq = new Tone.Sequence(
    (time, step) => {
      if (step === 0 || step === 2 ) {
        piano_G.start(time);
        piano_Asharp.start(time);
      }
      if (step === 4 || step === 6) {
        piano_F.start(time);
        piano_A.start(time);
      }
      if (step === 8 || step === 11 || step === 13) {
        piano_D.start(time);
        piano_G.start(time);
      }
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n"
  );

  if (Tone.Transport.state === "started") {
    stop()
  }
  Tone.Transport.start();

  drumsSeq1.start(0)
  drumsSeq1.loop = 8

  drumsSeq2.start("8m")
  drumsSeq2.loop = 24

  pianoSeq.start(0)
  pianoSeq.loop = 16

  arpSeq.start(0)
  arpSeq.loop = 6

}


function play(tempo) {

  Tone.Transport.scheduleOnce((time) => {
    playIntro(tempo);
  }, 0);

  const introDurationSec = 24*4*(60/tempo.value);
  Tone.Transport.scheduleOnce((time) => {
    playBuildup(tempo, time);
  }, introDurationSec);

  const buildupDurationSec = 8*4*(60/tempo.value);
  Tone.Transport.scheduleOnce((time) => {
    playDrop(tempo);
  }, buildupDurationSec);

  const dropDurationSec = 32*4*(60/tempo.value);
  Tone.Transport.scheduleOnce((time) => {
    playOutro(tempo);
  }, dropDurationSec);

  if (Tone.Transport.state === "started") {
    stop()
  }
  Tone.Transport.start();
}




function stop(){
    Tone.Transport.cancel();
    Tone.Transport.stop();
}