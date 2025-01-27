import "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"

console.log("This is my drum machine");

//Waiting for the HTML content to be loaded
document.addEventListener('DOMContentLoaded', function() {

    //Creation of the keys of the drum machine
    drum_machine_section()

    //Creation of the button section of the drum machine
    drum_machine_controls_section()

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
    "samples/kick.wav",
    "samples/snare.wav",
    "samples/closed_hihat.wav",
    "samples/open_hihat.wav",
    "samples/shaker.wav",
    "samples/fill.wav",
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


//Synth elements parameters
let osc1_param = {
    waveform: "sawtooth",
};

let osc2_param = {
    waveform: "sawtooth",
};

let lfo_param = {
    waveform: "sine",
};

let amp_envelope_param = {
    attack: 0.001,
    decay: 0.5,
    sustain: 0,
    release: 0.2,
};


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
        synth_controls_section()
        toggle_all_highlight_notes()
    }else{
        drum_machine_section()
        drum_machine_controls_section()
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
    load_drum_machine_play_section()
}

function drum_machine_controls_section() {
    var b = document.querySelector(".buttons");

    //Remove all previous sections
    while (b.firstChild) {
        b.firstChild.remove(); 
    }
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
                n.classList.add("black-note");
            }
            e.appendChild(n)
        }
        document.querySelector(".keyboard").appendChild(e)
    }

    //Finally load the elements of the synth
    load_synth_play_section()
}


function synth_controls_section() {
    var b = document.querySelector(".buttons");

    //Remove all previous sections
    while (b.firstChild) {
        b.firstChild.remove(); 
    }

    //Left section
    let left = document.createElement("div")
    left.classList.add("left-buttons")

    let upLeft = document.createElement("div")
    upLeft.classList.add("up-left-buttons")


    //OSC1 section
    let osc1 = document.createElement("div")
    osc1.id = "osc1"
    let header_osc1 = document.createElement("div")
    header_osc1.classList.add("header-section")
    header_osc1.textContent = "OSC 1"
    osc1.appendChild(header_osc1)

    let waveform_text_osc1 = document.createElement("div")
    waveform_text_osc1.classList.add("text-button")
    waveform_text_osc1.textContent = "WAVEFORM"
    osc1.appendChild(waveform_text_osc1)

    let waveform_btn_osc1 = document.createElement("img")
    waveform_btn_osc1.id = "osc1_waveform_selector"
    waveform_btn_osc1.draggable = false
    waveform_btn_osc1.classList.add("rotate-button")
    waveform_btn_osc1.classList.add("margin-rotate-btn")
    waveform_btn_osc1.src = "assets/sawtooth-wave.svg"
    osc1.appendChild(waveform_btn_osc1)

    let pitch_text_osc1 = document.createElement("div")
    pitch_text_osc1.classList.add("text-button")
    pitch_text_osc1.textContent = "PITCH"
    osc1.appendChild(pitch_text_osc1)

    let pitch_btn_osc1 = document.createElement("img")
    pitch_btn_osc1.id = "osc1_pitch_knob"
    pitch_btn_osc1.draggable = false
    pitch_btn_osc1.classList.add("mini-rotate-button")
    pitch_btn_osc1.src = "assets/knob.svg"
    osc1.appendChild(pitch_btn_osc1)


    //OSC2 section
    let osc2 = document.createElement("div")
    osc2.id = "osc2"
    let header_osc2 = document.createElement("div")
    header_osc2.classList.add("header-section")
    header_osc2.textContent = "OSC 2"
    osc2.appendChild(header_osc2)

    let waveform_text_osc2 = document.createElement("div")
    waveform_text_osc2.classList.add("text-button")
    waveform_text_osc2.textContent = "WAVEFORM"
    osc2.appendChild(waveform_text_osc2)

    let waveform_btn_osc2 = document.createElement("img")
    waveform_btn_osc2.id = "osc2_waveform_selector"
    waveform_btn_osc2.draggable = false
    waveform_btn_osc2.classList.add("rotate-button")
    waveform_btn_osc2.classList.add("margin-rotate-btn")
    waveform_btn_osc2.src = "assets/sawtooth-wave.svg"
    osc2.appendChild(waveform_btn_osc2)

    let cycle_text_osc2 = document.createElement("div")
    cycle_text_osc2.classList.add("text-button")
    cycle_text_osc2.textContent = "DUTY CYCLE"
    osc2.appendChild(cycle_text_osc2)

    let cycle_btn_osc2 = document.createElement("img")
    cycle_btn_osc2.id = "osc2_cycle_knob"
    cycle_btn_osc2.draggable = false
    cycle_btn_osc2.classList.add("mini-rotate-button")
    cycle_btn_osc2.src = "assets/knob.svg"
    osc2.appendChild(cycle_btn_osc2)


    //Mixer section
    let mixer = document.createElement("div")
    mixer.id = "mixer"
    let header_mixer = document.createElement("div")
    header_mixer.classList.add("header-section")
    header_mixer.textContent = "MIXER"
    mixer.appendChild(header_mixer)

    let osc1_vol_text = document.createElement("div")
    osc1_vol_text.classList.add("text-button")
    osc1_vol_text.textContent = "OSC 1"
    mixer.appendChild(osc1_vol_text)

    let osc1_vol_knob = document.createElement("img")
    osc1_vol_knob.id = "osc1_vol_knob"
    osc1_vol_knob.draggable = false
    osc1_vol_knob.classList.add("mini-rotate-button")
    osc1_vol_knob.classList.add("margin-mini-rotate-btn")
    osc1_vol_knob.src = "assets/knob.svg"
    mixer.appendChild(osc1_vol_knob)

    let osc2_vol_text = document.createElement("div")
    osc2_vol_text.classList.add("text-button")
    osc2_vol_text.textContent = "OSC 2"
    mixer.appendChild(osc2_vol_text)

    let osc2_vol_knob = document.createElement("img")
    osc2_vol_knob.id = "osc2_vol_knob"
    osc2_vol_knob.draggable = false
    osc2_vol_knob.classList.add("mini-rotate-button")
    osc2_vol_knob.src = "assets/knob.svg"
    mixer.appendChild(osc2_vol_knob)


    //LFO section
    let lfo = document.createElement("div")
    lfo.id = "lfo"
    let header_lfo = document.createElement("div")
    header_lfo.classList.add("header-section")
    header_lfo.textContent = "LFO"
    lfo.appendChild(header_lfo)

    let waveform_text_lfo = document.createElement("div")
    waveform_text_lfo.classList.add("text-button")
    waveform_text_lfo.textContent = "WAVEFORM"
    lfo.appendChild(waveform_text_lfo)

    let waveform_btn_lfo = document.createElement("img")
    waveform_btn_lfo.id = "lfo_waveform_selector"
    waveform_btn_lfo.draggable = false
    waveform_btn_lfo.classList.add("rotate-button")
    waveform_btn_lfo.classList.add("margin-rotate-btn")
    waveform_btn_lfo.src = "assets/sine-wave.svg"
    lfo.appendChild(waveform_btn_lfo)

    let rate_text_lfo = document.createElement("div")
    rate_text_lfo.classList.add("text-button")
    rate_text_lfo.textContent = "RATE"
    lfo.appendChild(rate_text_lfo)

    let rate_btn_lfo = document.createElement("img")
    rate_btn_lfo.id = "lfo_rate_knob"
    rate_btn_lfo.draggable = false
    rate_btn_lfo.classList.add("mini-rotate-button")
    rate_btn_lfo.src = "assets/knob.svg"
    lfo.appendChild(rate_btn_lfo)


    //LPF section
    let lpf = document.createElement("div")
    lpf.id = "lpf"
    let header_lpf = document.createElement("div")
    header_lpf.classList.add("header-section")
    header_lpf.textContent = "LPF"
    lpf.appendChild(header_lpf)

    let cutoff_text_lpf = document.createElement("div")
    cutoff_text_lpf.classList.add("text-button")
    cutoff_text_lpf.textContent = "CUTOFF"
    lpf.appendChild(cutoff_text_lpf)

    let cutoff_btn_lpf = document.createElement("img")
    cutoff_btn_lpf.id = "lfo_waveform_selector"
    cutoff_btn_lpf.draggable = false
    cutoff_btn_lpf.classList.add("rotate-button")
    cutoff_btn_lpf.classList.add("margin-rotate-btn")
    cutoff_btn_lpf.src = "assets/knob.svg"
    lpf.appendChild(cutoff_btn_lpf)

    let res_text_lpf = document.createElement("div")
    res_text_lpf.classList.add("text-button")
    res_text_lpf.textContent = "RESONANCE"
    lpf.appendChild(res_text_lpf)

    let res_btn_lpf = document.createElement("img")
    res_btn_lpf.id = "lfo_rate_knob"
    res_btn_lpf.draggable = false
    res_btn_lpf.classList.add("mini-rotate-button")
    res_btn_lpf.src = "assets/knob.svg"
    lpf.appendChild(res_btn_lpf)



    upLeft.append(osc1)
    upLeft.append(osc2)
    upLeft.append(mixer)
    upLeft.append(lfo)
    upLeft.append(lpf)

    left.appendChild(upLeft)



    //Right section
    let right = document.createElement("div")
    right.classList.add("right-buttons")


    b.appendChild(left)
    b.appendChild(right)


    load_synth_button_section()


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

function update_osc_waveform_button(osc) {
    if (osc == 1) {
        var waveform_btn = document.getElementById("osc1_waveform_selector")
        var new_waveform = osc1_param["waveform"]
    }
    if (osc == 2) {
        var waveform_btn = document.getElementById("osc2_waveform_selector")
        var new_waveform = osc2_param["waveform"]
    }
    //LFO
    if (osc == 3) {
        var waveform_btn = document.getElementById("lfo_waveform_selector")
        var new_waveform = lfo_param["waveform"]
    }

    waveform_btn.src = "assets/"+new_waveform+"-wave.svg"
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



function load_drum_machine_play_section() {
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
                if (sample_seqs[edit_mode][index] == 1) {
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

function load_synth_play_section() {
    //Notes click
    const notes = document.querySelectorAll(".note")
    notes.forEach((note, index) => {
        note.addEventListener('click', function() {

            toggle_note_synth(index)

        })
    })
}


function load_drum_machine_button_section() {

}


function load_synth_button_section() {

    //Waveform buttons
    let waveform_buttons = []
    waveform_buttons.push(document.getElementById("osc1_waveform_selector"))
    waveform_buttons.push(document.getElementById("osc2_waveform_selector"))
    waveform_buttons.push(document.getElementById("lfo_waveform_selector"))

    for (let i=0; i<waveform_buttons.length; i++) {
        waveform_buttons[i].addEventListener('click', function() {
            change_osc_waveform(i+1)
        })
    }




}


function change_osc_waveform(osc) {
    let waveforms = ["sawtooth", "triangle", "square", "sine"]
    if (osc == 1){
        let index = waveforms.indexOf(osc1_param["waveform"]);
        osc1_param["waveform"] = waveforms[(index+1) % waveforms.length]
    }
    if (osc == 2){
        let index = waveforms.indexOf(osc2_param["waveform"]);
        osc2_param["waveform"] = waveforms[(index+1) % waveforms.length]
    }
    //LFO
    if (osc == 3){
        let index = waveforms.indexOf(lfo_param["waveform"]);
        lfo_param["waveform"] = waveforms[(index+1) % waveforms.length]
    }
    update_osc_waveform_button(osc)
}


function play_seq() {
    intervalId = setInterval(function incr() {
        render_step_leds()
        let sample_leds = document.querySelectorAll(".led")
        for(let i=0; i<sample_seqs.length; i++){
            if (sample_seqs[i][counter] == 1){
                play_sample(i)
                if (edit_mode == -1 && mode == 0) {
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

    let osc1 = new Tone.Synth({
        oscillator: {
          type: osc1_param["waveform"]
        },
        envelope: {
          attack: amp_envelope_param["attack"],
          decay: amp_envelope_param["decay"],
          sustain: amp_envelope_param["sustain"],
          release: amp_envelope_param["release"],
        },
    }).toDestination();

    let osc2 = new Tone.Synth({
        oscillator: {
          type: osc2_param["waveform"]
        },
        envelope: {
          attack: amp_envelope_param["attack"],
          decay: amp_envelope_param["decay"],
          sustain: amp_envelope_param["sustain"],
          release: amp_envelope_param["release"],
        },
    }).toDestination();

    osc1.triggerAttackRelease(note);
    osc2.triggerAttackRelease(note);

    //Dispose the osc to avoid overload
    setTimeout(() => {
        osc1.dispose();
        osc2.dispose();
    }, 5000);
}


function convert_to_note_and_octave(key_index){
    let chroma_scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    let note = chroma_scale[key_index % 12]
    let octave = Math.floor(key_index / (12*NB_STEPS))
    return note+octave.toString()
}