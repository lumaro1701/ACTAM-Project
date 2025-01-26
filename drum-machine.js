import "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"

console.log("This is my drum machine");

//Waiting for the HTML content to be loaded
document.addEventListener('DOMContentLoaded', function() {

    //Creation of the keys of the drum machine
    drum_machine_section()

    //Load mode button
    const mode_button = document.getElementById("mode_button")
    mode_button.addEventListener('click', function() {
        switch_mode()
        update_mode_button()
    })

    //Load octave buttons
    const octave_down = document.getElementById("octave_down")
    octave_down.addEventListener('click', function() {
        change_octave(-1)
    })
    const octave_up = document.getElementById("octave_up")
    octave_up.addEventListener('click', function() {
        change_octave(1)
    })

    //Tempo knob and screen
    const tempo_button = document.getElementById('tempo_button')
    const screen = document.getElementById('screen')
    tempo_knob_rotation(tempo_button, screen);
    screen.textContent = `${BPM}`;


    //Play/pause button
    const play_button = document.getElementById("play_button")
    play_button.addEventListener('click', function() {

        if(play == 0){
            play_seq()
        }else{
            stop_seq()
        }
        play = 1 - play
        update_play_button()
    })
});









//-----MODEL-----
let counter = 0

//Min BPM, max BPM and starting BPM
let MIN_BPM = 20
let MAX_BPM = 250
let BPM = Math.round(MIN_BPM+(MAX_BPM-MIN_BPM)/2)

//Play mode (drum machine or synth)
let mode = 0
//Play state
let play = 0
//Edit state
let edit_mode = -1


let OCTAVE = 3
let MAX_OCTAVE = 7

let NB_STEPS = 16

//Create the audio context
const audio_context = new AudioContext()

//Remove the slight delay when triggering a note with ToneJS
Tone.context.lookAhead = 0

//Paths to samples for the drum machine
const samples = [
    "assets/kick.wav",
    "assets/snare.wav",
    "assets/closed_hihat.wav",
    "assets/open_hihat.wav",
    "assets/shaker.wav",
    "assets/fill.wav",
]

//2D array for the drum machine step sequencer
let sample_seqs = Array(NB_STEPS)
for(let i=0; i<sample_seqs.length; i++){
    sample_seqs[i] = Array(NB_STEPS)
    for(let j=0; j<sample_seqs[i].length; j++){
        sample_seqs[i][j] = 0
    }
}

//Array for the step sequencer
let notes_seqs = Array(NB_STEPS*12*MAX_OCTAVE)
for(let i=0; i<notes_seqs.length; i++){
    notes_seqs[i] = 0
}


//-----VIEW-----

let timeoutIds = []
//CLear all the timers to avoid bugs
function stop_all_timers() {
    timeoutIds.forEach(id => clearTimeout(id))
    timeoutIds = []
}

function switch_mode(){
    if (mode == 0){
        synth_section()
        toggle_all_highlight_notes()
    }else{
        drum_machine_section()
    }
    toggle_edit_mode(-1)
    mode = 1 - mode
}

function one_led_on(led, keep_on=false) {
    led.classList.add("led-on");
    if (!keep_on) {
        var timeoutId = setTimeout(function() {
            led.classList.remove("led-on");
            //Remove the timer from the list of timers if it's still there
            let index = timeoutIds.indexOf(timeoutId);
            if (index !== -1){
                timeoutIds.splice(index, 1)
            }
        }, (60/BPM)/4*1000 - 10)
        timeoutIds.push(timeoutId)
    }
    console.log(timeoutIds)
}

function all_step_led_off() {
    let leds = document.querySelectorAll(".step-led")
    leds.forEach(led => led.classList.remove("step-led-on"))
}

function all_sample_led_off() {
    let leds = document.querySelectorAll(".led")
    leds.forEach(led => led.classList.remove("led-on"))
}

function render_step_leds() {
    let leds = document.querySelectorAll(".step-led")
    all_step_led_off()
    leds[counter].classList.add("step-led-on")
}

function render_leds_edit(edit_sample_index) {
    all_sample_led_off()
    let steps_on = sample_seqs[edit_sample_index]
    let keys = document.querySelectorAll(".key")
    keys.forEach((key, index) => {
        if (steps_on[index] == 1){
            stop_all_timers()
            one_led_on(key.children[0], true)
        }
    })
}

function disable_all_select_buttons() {
    document.querySelectorAll(".select-button").forEach(button => button.style.backgroundColor = "")
}

function drum_machine_section() {
    var p = document.querySelector(".play-section");

    //Remove all previous sections
    while (p.firstChild) {
        p.firstChild.remove(); 
    }

    //Add the step leds section
    let leds = document.createElement("div")
    leds.classList.add("step-leds")
    p.appendChild(leds)

    //Add the keyboard section
    let k = document.createElement("div")
    k.classList.add("keyboard")
    p.appendChild(k)

    //Add the selectors section
    let s = document.createElement("div")
    s.classList.add("selectors")
    p.appendChild(s)

    //Create keys and selectors
    let e
    let l
    let step_led
    for(let i=0; i<NB_STEPS; i++){
        e = document.createElement("div")
        e.classList.add("key")
        l = document.createElement("div")
        l.classList.add("led")
        e.appendChild(l)
        k.appendChild(e)
        //Create selectors
        e = document.createElement("div")
        e.classList.add("select-button")
        e.textContent = "S"
        s.appendChild(e)
        //Create step leds
        step_led = document.createElement("div")
        step_led.classList.add("step-led")
        leds.appendChild(step_led)

    }

    //Finally load the elements of the drum machine
    load_elements_of_drum_machine()
}

function synth_section() {
    var p = document.querySelector(".play-section");

    //Remove all previous sections
    while (p.firstChild) {
        p.firstChild.remove(); 
    }

    //Add the step leds section
    let leds = document.createElement("div")
    leds.classList.add("step-leds")
    p.appendChild(leds)

    //Add the keyboard section
    let k = document.createElement("div")
    k.classList.add("keyboard")
    k.style.height = "90%"
    p.appendChild(k)

    let step_led
    for(let i=0; i<NB_STEPS; i++){
        //Create step leds
        step_led = document.createElement("div")
        step_led.classList.add("step-led")
        leds.appendChild(step_led)

        //Create columns of the grid (steps)
        let e = document.createElement("div")
        e.classList.add("step")

        //Add the keys for each step
        let n
        for(let i=0; i<12; i++){
            n = document.createElement("div")
            n.classList.add("note");
            //Black notes
            if (i == 1 || i == 3 || i == 6 || i == 8 || i == 10){
                n.classList.add("black_note");
            }
            e.appendChild(n)
        }
        document.querySelector(".keyboard").appendChild(e)
    }

    //Finally load the elements of the synth
    load_elements_of_synth()
}


function synth_controls_section() {

}



function toggle_all_highlight_notes(){
    const notes = document.querySelectorAll(".note")
    notes.forEach((note, index) => {
        let true_idx = NB_STEPS*12*OCTAVE + index

        if (notes_seqs[true_idx] == 1){
            note.style.backgroundColor = "#ff0000"
        } else {
            note.style.backgroundColor = ""
        }

    });
}


function update_octave_buttons(){
    let octave_down = document.getElementById('octave_down')
    let octave_up = document.getElementById('octave_up')

    if(OCTAVE == 0) {
        octave_down.style.backgroundColor = "#d40000"
        octave_up.style.backgroundColor = ""
    }if(OCTAVE == 1) {
        octave_down.style.backgroundColor = "#d47600"
        octave_up.style.backgroundColor = ""
    }if(OCTAVE == 2) {
        octave_down.style.backgroundColor = "#e9e302"
        octave_up.style.backgroundColor = ""
    }if(OCTAVE == 3) {
        octave_down.style.backgroundColor = ""
        octave_up.style.backgroundColor = ""
    }if(OCTAVE == 4) {
        octave_down.style.backgroundColor = ""
        octave_up.style.backgroundColor = "#e9e302"
    }if(OCTAVE == 5) {
        octave_down.style.backgroundColor = ""
        octave_up.style.backgroundColor = "#d47600"
    }if(OCTAVE == 6) {
        octave_down.style.backgroundColor = ""
        octave_up.style.backgroundColor = "#d40000"
    }
}


function update_play_button(){
    let play_button = document.getElementById("play_button")
    if (play == 0){
        play_button.style.backgroundColor = ""
        play_button.src = "assets/play.svg"
    } else {
        play_button.style.backgroundColor = "#d47600"
        play_button.src = "assets/pause.svg"
    }
}

function update_mode_button(){
    let mode_button = document.getElementById("mode_button")
    if (mode == 0){
        mode_button.src = "assets/keyboard.svg"
    } else {
        mode_button.src = "assets/drum.svg"
    }
}


//-----CONTROLLER-----
let intervalId = 0

function tempo_knob_rotation(knob, screen) {
    let currentRotation = 0; // Track the current rotation angle
    
    // Rotation limits
    const MIN_ROTATION = -145;
    const MAX_ROTATION = 145;
  
    // Listen for the wheel event to rotate the knob
    knob.addEventListener('wheel', (e) => {
        // Prevent default scroll behavior (optional if you don't want the page to scroll)
        e.preventDefault();
    
        // Determine the scroll direction (wheel delta)
        const delta = e.deltaY; // Positive for scrolling down, negative for scrolling up
    
        // Adjust rotation based on wheel movement
        let newRotation = currentRotation + (delta / 5); // Adjust speed here by changing divisor
    
        // Clamp the rotation to the bounds
        if (newRotation < MIN_ROTATION) {
            newRotation = MIN_ROTATION;
        } else if (newRotation > MAX_ROTATION) {
            newRotation = MAX_ROTATION;
        }
    
        // Apply the new rotation to the knob
        knob.style.transform = `rotate(${newRotation}deg)`;
    
        // Update the current rotation for future calculations
        currentRotation = newRotation;
        BPM = Math.round((MAX_BPM-MIN_BPM)/(MAX_ROTATION-MIN_ROTATION)*currentRotation + MIN_BPM+(MAX_BPM-MIN_BPM)/2)
        screen.textContent = `${BPM}`;
    });
  }



function load_elements_of_drum_machine() {
    //Keys click
    const keys = document.querySelectorAll(".key")
    keys.forEach((key, index) => {
        key.addEventListener('click', function() {

            //Play mode
            if (edit_mode == -1) {
                key_clicked(key, index)
            }

            //Edit mode
            else {
                edit_sample_seq(index, edit_mode)
                //Play the sample only if it has been activated (not deactivated)
                if (sample_seqs[index][edit_mode] == 1) {
                    play_sample(edit_mode)
                }
            }
            
        })
    })

    //Selector and edit mode
    const selectors = document.querySelectorAll(".select-button")
    selectors.forEach((selector, index) => {
        selector.addEventListener('click', function (){
            toggle_edit_mode(index)
        })
    })
}

function load_elements_of_synth() {
    //Notes click
    const notes = document.querySelectorAll(".note")
    notes.forEach((note, index) => {
        note.addEventListener('click', function() {

            toggle_note_synth(index)

        })
    })
}

function play_seq() {
    intervalId = setInterval(function incr() {
        render_step_leds()
        let sample_leds = document.querySelectorAll(".led")
        for(let i=0; i<sample_seqs.length; i++){
            if (sample_seqs[i][counter] == 1){
                play_sample(i)
                if (edit_mode == -1) {
                    one_led_on(sample_leds[i])
                }
            }
        }
    
        for (let j=0; j<MAX_OCTAVE; j++){
            for (let i=counter*12; i<counter*12+12; i++) {
                let true_idx = j*12*NB_STEPS + i
    
                if (notes_seqs[true_idx] == 1) {
                    play_note(true_idx)
                }
            }
        }
        
        counter = (counter+1) % NB_STEPS
    }, (60/BPM)/4*1000)
}

function stop_seq() {
    clearInterval(intervalId)
    stop_all_timers()
    all_step_led_off()
    if (edit_mode == -1){
        all_sample_led_off()
    }
    counter = 0
}

function edit_sample_seq(key_index, sample_index) {
    sample_seqs[sample_index][key_index] = 1 - sample_seqs[sample_index][key_index]
    render_leds_edit(sample_index)
}

function toggle_edit_mode(index) {
    disable_all_select_buttons()
    if(edit_mode == index || index == -1){
        edit_mode = -1
        all_sample_led_off()
    }else{
        edit_mode = index
        all_sample_led_off()
        render_leds_edit(edit_mode)
        document.querySelectorAll(".select-button")[index].style.backgroundColor = "#ff0000"
    }
}

function toggle_note_synth(index){
    let true_idx = NB_STEPS*12*OCTAVE + index
    
    if (notes_seqs[true_idx] == 0) {
        notes_seqs[true_idx] = 1
        play_note(true_idx)
    } else {
        notes_seqs[true_idx] = 0
    }

    toggle_all_highlight_notes()

}


function key_clicked(key, key_index) {
    one_led_on(key.children[0])
    if(mode == 0){
        play_sample(key_index)
    }
}


function change_octave(nb){
    if(OCTAVE+nb >= 0 && OCTAVE+nb <= 6){
        OCTAVE += nb
        update_octave_buttons()
        toggle_all_highlight_notes()
    }
}


function play_sample(sample_index){
    if(sample_index < samples.length){
        //Loading audio samples in a buffer
        fetch(samples[sample_index]).then(response => response.arrayBuffer()).then(buffer => audio_context.decodeAudioData(buffer)).then(buffer => {
            var track = audio_context.createBufferSource();
            track.buffer = buffer;
            track.connect(audio_context.destination);
            track.start(0);
        });
    }
}

function play_note(key_index) {

    let note = convert_to_note_and_octave(key_index)

    let synth = new Tone.Synth({
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

    synth.triggerAttackRelease(note);
}


function convert_to_note_and_octave(key_index){
    let chroma_scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    let note = chroma_scale[key_index % 12]
    let octave = Math.floor(key_index / (12*NB_STEPS))
    return note+octave.toString()
}