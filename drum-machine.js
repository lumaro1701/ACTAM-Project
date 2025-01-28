import "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"


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
    knob_rotation(tempo_button);
    change_screen_display(BPM)


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
const MIN_BPM = 20
const MAX_BPM = 250
let BPM = Math.round(MIN_BPM+(MAX_BPM-MIN_BPM)/2)

//Rotative buttons range limits
const MIN_ROTATION = -145;
const MAX_ROTATION = 145;

//Play mode (drum machine or synth)
let mode = 0
//Play state
let play = 0
//Edit state
let edit_mode = -1

//Octave settings
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

//Array for the synth step sequencer
let notes_seqs = Array(NB_STEPS*12*MAX_OCTAVE)
for(let i=0; i<notes_seqs.length; i++){
    notes_seqs[i] = 0
}


//Synth parameters
const SETTING_BOUNDS = {
    attack: [0.0, 5.0],
    decay: [0.0, 5.0],
    sustain: [0.0, 1.0],
    release: [0.0, 5.0],
    osc_volume: [0.0, 1.0],
    lfo_rate: [0.1, 20.0],
    lfo_mod_amt: [0, 1],
}


let osc1_param = {
    waveform: "sawtooth",
    volume: 1,
};

let osc2_param = {
    waveform: "sawtooth",
    volume: 1,
};

let lfo_param = {
    waveform: "sawtooth",
    frequency: 20,
    mod_amt: 1,
};

let amp_envelope_param = {
    attack: 0.001,
    decay: 0.5,
    sustain: 0,
    release: 0.2,
};

let filt_envelope_param = {
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

    //Left section (which contains main and modulation section)
    let left = document.createElement("div")
    left.classList.add("left-buttons")


    //Main section (osc, mixer, lfo, lpf)
    let main = document.createElement("div")
    main.classList.add("main-section")


    //Oscillators sections (osc1, osc2 and lfo)
    let oscillators = ["osc_1", "osc_2", "lfo"]
    oscillators.forEach(osc_name => {
        let osc = document.createElement("div")
        osc.id = osc_name.replace(/_/g, '')
        let header = document.createElement("div")
        header.classList.add("header-section")
        header.textContent = osc_name.replace(/_/g, ' ').toUpperCase()
        osc.appendChild(header)
    
        let waveform_text = document.createElement("div")
        waveform_text.classList.add("text-button")
        waveform_text.textContent = "WAVEFORM"
        osc.appendChild(waveform_text)
    
        let waveform_btn = document.createElement("img")
        waveform_btn.id = osc_name.replace(/_/g, '')+"_waveform_selector"
        waveform_btn.draggable = false
        waveform_btn.classList.add("rotate-button")
        waveform_btn.classList.add("margin-rotate-btn")
        waveform_btn.src = "assets/sawtooth-wave.svg"
        osc.appendChild(waveform_btn)
    
        let second_param_text = document.createElement("div")
        second_param_text.classList.add("text-button")
        if (osc_name == "osc_1") {
            var second_param_name = "pitch"
        } else if (osc_name == "osc_2") {
            var second_param_name = "duty_cycle"
        } else {
            var second_param_name = "rate"
        }
        second_param_text.textContent = second_param_name.replace(/_/g, ' ').toUpperCase()
        osc.appendChild(second_param_text)
    
        let second_param_knob = document.createElement("img")
        second_param_knob.id = osc_name.replace(/_/g, '')+"_"+second_param_name+"_knob"
        second_param_knob.draggable = false
        second_param_knob.classList.add("mini-rotate-button")
        second_param_knob.src = "assets/knob.svg"
        osc.appendChild(second_param_knob)

        main.append(osc)
    })

    //Mixer section
    let mixer = document.createElement("div")
    mixer.id = "mixer"
    let header_mixer = document.createElement("div")
    header_mixer.classList.add("header-section")
    header_mixer.textContent = "MIXER"
    mixer.appendChild(header_mixer)

    let osc_names = ["osc_1", "osc_2"]
    osc_names.forEach(osc_name => {
        let osc_vol_text = document.createElement("div")
        osc_vol_text.classList.add("text-button")
        osc_vol_text.textContent = osc_name.replace(/_/g, ' ').toUpperCase()
        mixer.appendChild(osc_vol_text)

        let osc_vol_knob = document.createElement("img")
        osc_vol_knob.id = osc_name.replace(/_/g, '')+"_vol_knob"
        osc_vol_knob.draggable = false
        osc_vol_knob.classList.add("mini-rotate-button")
        osc_vol_knob.classList.add("margin-mini-rotate-btn")
        osc_vol_knob.src = "assets/knob.svg"
        mixer.appendChild(osc_vol_knob)
    })

    main.append(mixer)

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

    main.append(lpf)


    left.appendChild(main)


    //Modulation section
    let modulation = document.createElement("div")
    modulation.classList.add("modulation-section")

    let mod_header = document.createElement("div")
    mod_header.classList.add("header-section")
    mod_header.textContent = "MODULATION AMOUNTS"
    modulation.appendChild(mod_header)

    let mod_knobs = document.createElement("div")
    mod_knobs.classList.add("mod-knobs")
    modulation.appendChild(mod_knobs)

    let params = ["osc_freq", "duty_cycle", "lpf_cutoff"]
    params.forEach(param => {
        let block = document.createElement("div")
        block.id = param+"_mod_block"
        mod_knobs.appendChild(block)

        let text = document.createElement("div")
        text.classList.add("text-button")
        text.textContent = param.replace(/_/g, ' ').toUpperCase()
        block.appendChild(text)

        let knob = document.createElement("img")
        knob.id = param+"_mod_knob"
        knob.draggable = false
        knob.classList.add("mini-rotate-button")
        knob.src = "assets/knob.svg"
        block.appendChild(knob)
    })

    left.appendChild(modulation)



    //Right section (envelopes)
    let right = document.createElement("div")
    right.classList.add("right-buttons")

    let envelopes = ["filter", "amplifier"]
    envelopes.forEach(envelope => {
        let env = document.createElement("div")
        env.id = envelope+"_env"

        let header = document.createElement("div")
        header.classList.add("header-section")
        header.textContent = envelope.toUpperCase()+" ENVELOPE"
        env.appendChild(header)

        let knobs = document.createElement("div")
        knobs.classList.add("env-knobs")
        env.appendChild(knobs)

        let controls = ["attack", "decay", "sustain", "release"]
        controls.forEach(control => {
            let block = document.createElement("div")
            block.id = control+"_"+envelope+"_env_block"
            knobs.appendChild(block)

            let text = document.createElement("div")
            text.classList.add("text-button")
            text.textContent = control.toUpperCase()
            block.appendChild(text)

            let knob = document.createElement("img")
            knob.id = control+"_"+envelope+"_env_knob"
            knob.draggable = false
            knob.classList.add("mini-rotate-button")
            knob.src = "assets/knob.svg"
            block.appendChild(knob)
        })

        right.appendChild(env)
    })

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


function linear_interpolation(x, x1, x2, y1, y2) {
    return y1 + (x - x1) * (y2 - y1) / (x2 - x1);
}

function inverse_linear_interpolation(y, x1, x2, y1, y2) {
    return x1 + ((x2 - x1) / (y2 - y1)) * (y - y1);
}

function exp_interpolation(x, x1, x2, y1, y2, k=2) {
    let t = (x - x1) / (x2 - x1);
    return y1 + (y2 - y1) * Math.pow(t, k);
}

function inverse_exp_interpolation(y, x1, x2, y1, y2) {
    return x1 + (x2 - x1) * (Math.log(y / y1) / Math.log(y2 / y1));
}


function knob_rotation(knob) {
    let currentRotation = 0; //Track the current rotation angle
  
    //Listen for the wheel event to rotate the knob
    knob.addEventListener('wheel', (e) => {
        //Prevent default scroll behavior
        e.preventDefault();
    
        //Determine the scroll direction (wheel delta)
        const delta = e.deltaY; //Positive for scrolling down, negative for scrolling up
    
        //Adjust rotation based on wheel movement
        let newRotation = currentRotation + (delta / 5); //Adjust speed here by changing divisor
    
        //Clamp the rotation to the bounds
        if (newRotation < MIN_ROTATION) {
            newRotation = MIN_ROTATION;
        } else if (newRotation > MAX_ROTATION) {
            newRotation = MAX_ROTATION;
        }
    
        //Apply the new rotation to the knob
        knob.style.transform = `rotate(${newRotation}deg)`;
    
        //Update the current rotation for future calculations
        currentRotation = newRotation;

        //Update the value of the desired parameter by calling the appropriate function        
        if (knob.id.includes("env")){
            let knob_id_splitted = knob.id.split('_')

            if (knob_id_splitted[0] == "sustain") {
                var interpol_method = linear_interpolation
            } else {
                var interpol_method = exp_interpolation
            }
            change_envelope_settings(
                knob_id_splitted[1], //The envelope considered
                knob_id_splitted[0], //The setting to update
                currentRotation, //The angle value that will be interpolated
                interpol_method
            )
        }

        if (knob.id.includes("tempo")) {
            BPM = Math.round((MAX_BPM-MIN_BPM)/(MAX_ROTATION-MIN_ROTATION)*currentRotation + MIN_BPM+(MAX_BPM-MIN_BPM)/2)
            change_screen_display(BPM)
        }

        if (knob.id.includes("vol_knob")) {
            let knob_id_splitted = knob.id.split('_')
            change_osc_vol(knob_id_splitted[0], currentRotation)
        }

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

    //Envelopes knobs
    let settings = ["attack", "decay", "sustain", "release"]
    let envelopes = ["filter", "amplifier"]

    envelopes.forEach(env => {
        settings.forEach(setting => {
            let element = document.getElementById(setting+"_"+env+"_env_knob")
            knob_rotation(element)
        })
    })

    //Mixer knobs
    let osc_names = ["osc1", "osc2"]
    osc_names.forEach(osc_name => {
        let element = document.getElementById(osc_name+"_vol_knob")
        knob_rotation(element)
    })



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

function change_osc_vol(osc_name, value) {
    let new_value = linear_interpolation(
        value, 
        MIN_ROTATION, 
        MAX_ROTATION, 
        SETTING_BOUNDS["osc_volume"][0],
        SETTING_BOUNDS["osc_volume"][1]
    )

    if (osc_name == "osc1") {
        osc1_param["volume"] = new_value
    } else if (osc_name == "osc2") {
        osc2_param["volume"] = new_value
    }
}


function change_envelope_settings(env, setting, value, interpol_method=linear_interpolation) {
    let new_value = interpol_method(
        value, 
        MIN_ROTATION, 
        MAX_ROTATION, 
        SETTING_BOUNDS[setting][0],
        SETTING_BOUNDS[setting][1]
    )
    
    if (env == "filter") {
        filt_envelope_param[setting] = new_value
    } else if (env == "amplifier") {
        amp_envelope_param[setting] = new_value
    }
}

function change_screen_display(new_display) {
    let screen = document.getElementById("screen")
    screen.textContent = `${new_display}`
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

    //Set the volume of the oscillators
    osc1.volume.value = convert_to_db(osc1_param["volume"])
    osc2.volume.value = convert_to_db(osc2_param["volume"])


    //The note duration is maximum a cycle of the sequencer
    osc1.triggerAttackRelease(note, (60/BPM)/4);
    osc2.triggerAttackRelease(note, (60/BPM)/4);

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

function convert_to_db(value) {
    return 20*Math.log10(value+Number.MIN_VALUE)
}