import "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"


//Waiting for the HTML content to be loaded
document.addEventListener('DOMContentLoaded', function() {

    const playBtn = document.querySelector("#play-button");
    playBtn.addEventListener('click', function() {
        play(174)
    })
    
});

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
    "G1", "G1", "F1", "F1", "D#1", "D#1", "D#1", "D#1",
    "D#1", "D#1", "F1", "F1", "C2", "C2", "C2", "C2",
    "C2", "C2", "D1", "D1", "D#1", "D#1", "D#1", "D#1",
    "D#1", "D#1" , "F1", "F1", "G1", "G1", "G1", "G1"]


const pianoSequence = [
    {"time": "0:0:0", "note": ["G4", "A#4"]},
    {"time": "0:0:1", "note": []},
    {"time": "0:0:2", "note": ["G4", "A#4"]},
    {"time": "0:0:3", "note": []},
    {"time": "0:1:0", "note": ["F4", "A4"]},
    {"time": "0:1:1", "note": []},
    {"time": "0:1:2", "note": ["F4", "A4"]},
    {"time": "0:1:3", "note": []},
    {"time": "0:2:0", "note": ["D4", "G4"]},
    {"time": "0:2:1", "note": []},
    {"time": "0:2:2", "note": []},
    {"time": "0:2:3", "note": ["D4", "G4"]},
    {"time": "0:3:0", "note": []},
    {"time": "0:3:1", "note": ["D4", "G4"]},
    {"time": "0:3:2", "note": []},
    {"time": "0:3:3", "note": []}]


function play(bpm) {

    Tone.Transport.bpm.value = bpm;

    const arpSynth = new Tone.Synth({
        oscillator: {
          type: "sine"
        },
        envelope: {
          attack: 0.005,
          decay: 0.2,
          sustain: 0.0,
          release: 0.2,
        },
    }).toDestination();

    const pianoSynth = new Tone.PolySynth(Tone.Synth).toDestination();
    pianoSynth.set({
        oscillator: {
            type: "sawtooth"
          },
          envelope: {
            attack: 0.0,
            decay: 0.1,
            sustain: 0.2,
            release: 0.1,
          },
    })

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
        decay : 0.4,
        sustain : 0.0,
        release : 0.4
        },
        filterEnvelope : {
        attack : 0.0,
        decay : 0.5,
        sustain : 0.0,
        release : 0.5,
        baseFrequency : 40,
        octaves : 7,
        exponent : 2
        }            
    }).toDestination();

    bassSynth.volume.value = 6



    const kick = new Tone.Player("assets/kick.wav").toDestination();
    const snare = new Tone.Player("assets/snare.wav").toDestination();
    const fill = new Tone.Player("assets/fill.wav").toDestination();
    const hihat = new Tone.Player("assets/open_hihat.wav").toDestination();
    

    const drumsSeq = new Tone.Sequence(
        (time, step) => {
          // For each step, trigger the corresponding drum sound
          if (step === 0 || step === 5 ) {
            kick.start(time);
          }
          if (step % 4 === 2) {
            snare.start(time);
          }
          if (step === 3) {
            fill.start(time);
          }
          if (step % 2 === 0) {
            hihat.start(time);
          }
        }, [0, 1, 2, 3, 4, 5, 6, 7], "8n"
    );

    const arpSeq = new Tone.Sequence(function(time, note){
        arpSynth.triggerAttackRelease(note, "8n", time);
    }, arpSequence, "8n");


    const pianoSeq = new Tone.Part((time, chord) => {
        pianoSynth.triggerAttackRelease(chord.note, "8n", time)
    }, pianoSequence)

    const bassSeq = new Tone.Sequence(function(time, note){
        bassSynth.triggerAttackRelease(note, "8n", time);
    }, bassSequence, "8n");


    Tone.Transport.start();
    arpSeq.start(0); // Start immediately at time 0
    pianoSeq.loop = 16
    pianoSeq.start(0)
    bassSeq.start(0)
    drumsSeq.start(0)

}