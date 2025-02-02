import "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"


//Waiting for the HTML content to be loaded
document.addEventListener('click', function() {

    if (Tone.context.state !== 'running') {
        Tone.start()

        //Creation of the synth play section
        create_synth_play_section()

        //Create synth knobs and load (connect) them
        load_synth_elements()
        create_synth_knobs_section()
        load_synth_knobs_section()

        //Load mode button
        let mode_button = document.getElementById("mode_button")
        mode_button.addEventListener('click', function() {
            switch_mode()
        })

        //Load octave buttons
        let octave_down = document.getElementById("octave_down")
        octave_down.addEventListener('click', function() {
            change_octave(-1)
        })
        let octave_up = document.getElementById("octave_up")
        octave_up.addEventListener('click', function() {
            change_octave(1)
        })

        //Tempo knob and screen
        let tempo_knob = document.getElementById('tempo_knob')
        let screen = document.getElementById('screen')
        knob_rotation(tempo_knob)
        change_screen_display(BPM) //Display the BPM at the loading

        //Play/pause button
        let play_button = document.getElementById("play_button")
        play_button.addEventListener('click', function() {

            if(PLAY == 0){ //Not playing
                play_seq()
            }else{ //Playing
                stop_seq()
            }
            PLAY = 1 - PLAY
            update_play_button()
        })
    }

});








// -----------------------------------------------
// -------------------- MODEL --------------------
// -----------------------------------------------

//Min BPM, max BPM and starting BPM
let BPM = 120

//Drum machine (0) or synth (1) mode
let MODE = 1

//Play state (1 = sequence is playing)
let PLAY = 0

//Edit state (-1 if not in edit state)
let EDIT = -1

//Octave settings
let OCTAVE = 3
const MAX_OCTAVE = 7

//Sequencer parameters
const NB_STEPS = 16

//Number of voices of polyphony
const NB_VOICES_POLYPHONY = 16

//Create the audio context
const audio_context = new AudioContext()

//Remove the slight delay when triggering a note with ToneJS
Tone.context.lookAhead = 0

//Array containing the buffers of the drum machine samples
var samples = Array(NB_STEPS).fill(null)

//Load the default samples into the previously defined array
const sample_paths = [
    "samples/kick.wav",
    "samples/kick2.wav",
    "samples/kick3.wav",
    "samples/snare.wav",
    "samples/snare2.wav",
    "samples/snare3.wav",
    "samples/closed_hihat.wav",
    "samples/closed_hihat2.wav",
    "samples/closed_hihat3.wav",
    "samples/open_hihat.wav",
    "samples/open_hihat2.wav",
    "samples/clap.wav",
    "samples/clap2.wav",
    "samples/clap3.wav",
    "samples/ride.wav",
    "samples/crash.wav",
]

for (let i=0; i<sample_paths.length; i++) {
    if (i < samples.length) {
        samples[i] = await load_audio_file(sample_paths[i])
    }
}

//2D array for the drum machine step sequencer
let sample_seqs = Array(NB_STEPS)
for(let i=0; i<sample_seqs.length; i++){
    sample_seqs[i] = Array(NB_STEPS).fill(0)
}

//Array for the synth step sequencer
let notes_seqs = Array(NB_STEPS*12*MAX_OCTAVE).fill(0)

//Synth parameters
const SETTING_BOUNDS = {
    knobs_rotation: [-145, 145],
    bpm: [20, 250],
    attack: [0.0, 2.0],
    decay: [0.0, 2.0],
    sustain: [0.0, 1.0],
    release: [0.0, 5.0],
    osc1_vol: [0.0, 1.0],
    osc2_vol: [0.0, 1.0],
    osc1_freqMod: [0, 500], //Same for OSC2
    osc1_pitch: [-1200, 1200],
    osc2_pw: [-1, 1],
    osc2_pwMod: [0, 0.5],
    lfo_rate: [0.1, 20.0],
    lpf_cutoff: [1, 18000],
    lpf_resonance: [0, 15],
    lpf_lfoMod: [0, 15000],
    lpf_envMod: [0, 15000],
}

let osc1_param = {
    waveform: "sawtooth",
    vol: 1,
    freqMod: 0,
    pitch: 0,
};

let osc2_param = {
    waveform: "sawtooth",
    vol: 1,
    freqMod: osc1_param["freqMod"],
    pw: 0,
    pwMod: 0,
};

let lfo_param = {
    waveform: "sine",
    frequency: 5,
};

let lpf_param = {
    type: "lowpass",
    cutoff: 18000,
    rolloff: -24,
    resonance: 0,
    lfoMod: 0,
    envMod: 0,
}

let amp_envelope_param = {
    attack: 0.0,
    decay: 0.0,
    sustain: 1.0,
    release: 0.0,
};

let filt_envelope_param = {
    attack: 0.0,
    decay: 0.0,
    sustain: 1.0,
    release: 0.0,
};


//Create all the Tone.JS nodes for the synth and connect them together
function load_synth_elements() {

    //Create filter (LPF)
    window.lpf = new Tone.Filter({
        type: lpf_param["type"],
        frequency: lpf_param["cutoff"],
        rolloff: lpf_param["rolloff"],
        Q: lpf_param["resonance"]
    }).toDestination();


    //Create filter envelope and connect it through a Scale object
    window.lpf_env_scale = new Tone.Scale({
        min: lpf_param["cutoff"],
        max: lpf_param["cutoff"]+lpf_param["envMod"]
    }).connect(lpf.frequency)

    window.lpf_envelope = new Tone.Envelope({
        curve: "exponential",
        attack: filt_envelope_param["attack"],
        decay: filt_envelope_param["decay"],
        sustain: filt_envelope_param["sustain"],
        release: filt_envelope_param["release"],
    }).connect(lpf_env_scale)


    //Create LFO
    window.lfo = new Tone.LFO({
        type: lfo_param["waveform"],
        min: -1,
        max: 1,
        frequency: lfo_param["frequency"],
    }).start()


    //Connect LFO to LPF for cutoff frequency modulation
    window.lpf_lfo = new Tone.Scale({
        min: lpf_param["cutoff"],
        max: lpf_param["cutoff"]+lpf_param["lfoMod"]
    }).connect(lpf.frequency)
    lfo.connect(lpf_lfo)


    //Create oscillators
    window.oscillators1 = []
    window.oscillators2 = []
    window.osc1_lfo_scales = []
    window.osc2_lfo_scales = []
    window.osc2_pwm_scales = []
    let osc_lists = [oscillators1, oscillators2]
    let params_list = [osc1_param, osc2_param]
    let osc_lfo_scales_list = [osc1_lfo_scales, osc2_lfo_scales]

    for (let i=0; i<osc_lists.length; i++) {
        for (let j=0; j<NB_VOICES_POLYPHONY; j++) {

            let osc = new Tone.Synth({
                oscillator: {
                    type: params_list[i]["waveform"]
                },
                envelope: {
                    curve: "exponential",
                    attack: amp_envelope_param["attack"],
                    decay: amp_envelope_param["decay"],
                    sustain: amp_envelope_param["sustain"],
                    release: amp_envelope_param["release"],
                },
            }).connect(lpf)

            //Connect LFO to OSCs for pitch modulation
            let osc_lfo_scale = new Tone.Scale({
                min: 0,
                max: 0
            }).connect(osc.frequency)
            lfo.connect(osc_lfo_scale)

            //Create but don't connect LFO to OSC2 for PWM yet
            if (i == 1) { //Only for OSC2
                let pwm_scale = new Tone.Scale({
                    min: osc2_param["pwMod"],
                    max: osc2_param["pwMod"]
                })
                lfo.connect(pwm_scale)
                osc2_pwm_scales.push(pwm_scale)
            }

            //Push the newly created objects into their respective lists
            osc_lfo_scales_list[i].push(osc_lfo_scale)
            osc_lists[i].push(osc)
        }
    }

    //Map all the param variables to the concerned element of the synth
    // so it is easier to access them
    window.param_variables = {
        osc1: osc1_param,
        osc2: osc2_param,
        osc1_list: oscillators1,
        osc2_list: oscillators2,
        lpf: lpf_param,
        lfo: lfo_param,
        filter_env: filt_envelope_param,
        amplifier_env: amp_envelope_param
    }

}








// -----------------------------------------------
// -------------------- VIEW ---------------------
// -----------------------------------------------

let timeoutIds = []
//CLear all the timers to avoid bugs
function stop_all_timers() {
    timeoutIds.forEach(id => clearTimeout(id))
    timeoutIds = []
}

//Change mode from synth to drum machine or vice versa
function switch_mode(){
    MODE = 1 - MODE

    let mode_button = document.getElementById("mode_button")
    if (MODE == 1){
        create_synth_play_section()
        display_all_highlight_notes()
        mode_button.src = "assets/drum.svg"
    }else{
        create_drum_machine_play_section()
        mode_button.src = "assets/keyboard.svg"
    }
    toggle_edit_mode(-1)
}

//Turn on one sample led
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

//Turn off all step leds
function all_step_led_off() {
    let leds = document.querySelectorAll(".step-led")
    leds.forEach(led => led.classList.remove("step-led-on"))
}

//Turn off all sample leds
function all_sample_led_off() {
    let leds = document.querySelectorAll(".led")
    leds.forEach(led => led.classList.remove("led-on"))
}

//Render step leds depending on the counter value
function render_step_leds() {
    let leds = document.querySelectorAll(".step-led")
    all_step_led_off()
    leds[counter].classList.add("step-led-on")
}

//Render sample leds depending on the sample index
function render_leds_edit(sample_index) {
    all_sample_led_off()
    let steps_on = sample_seqs[sample_index]
    let keys = document.querySelectorAll(".key")
    keys.forEach((key, index) => {
        if (steps_on[index] == 1){
            stop_all_timers()
            one_led_on(key.children[0], true)
        }
    })
}

//Render the select buttons depending on the EDIT value
function render_select_buttons() {
    //Turn off all select buttons
    document.querySelectorAll(".select-button").forEach(button => button.style.backgroundColor = "")
    if (EDIT !== -1) {
        //Turn on only the correct select button
        document.querySelectorAll(".select-button")[EDIT].style.backgroundColor = "#ff6a00" 
    }
}

//Change angle of knobs when rotated
function display_rotate_knob(knob, rotation_angle) {
    knob.style.transform = `rotate(${rotation_angle}deg)`;
}

//Change the screen display
function change_screen_display(new_display) {
    let screen = document.getElementById("screen")
    screen.textContent = `${new_display}`
}

//Clean play section except for the step leds
function clean_play_section() {
    var p = document.querySelector(".play-section");

    //Remove all previous elements
    while (p.firstChild) {
        p.firstChild.remove(); 
    }

    //Add the step leds section
    let leds = document.createElement("div")
    leds.classList.add("step-leds")
    p.appendChild(leds)

    for(let i=0; i<NB_STEPS; i++){
        //Create step leds
        let step_led = document.createElement("div")
        step_led.classList.add("step-led")
        leds.appendChild(step_led)
    }
}

//Create the drum machine play section
function create_drum_machine_play_section() {
    clean_play_section()
    var p = document.querySelector(".play-section");

    //Add the keyboard section
    let keyboard = document.createElement("div")
    keyboard.classList.add("keyboard")
    p.appendChild(keyboard)

    //Add the selectors section
    let selectors = document.createElement("div")
    selectors.classList.add("selectors")
    p.appendChild(selectors)

    //Add the upload buttons section
    let uploads = document.createElement("div")
    uploads.classList.add("upload")
    p.appendChild(uploads)

    //Create keys, selectors and upload buttons
    for(let i=0; i<NB_STEPS; i++){
        //Create keys and leds
        let key = document.createElement("div")
        key.classList.add("key")
        let led = document.createElement("div")
        led.classList.add("led")
        key.appendChild(led)
        keyboard.appendChild(key)
        //Create selectors
        let select_btn = document.createElement("img")
        select_btn.classList.add("select-button")
        select_btn.src = "assets/edit.svg"
        select_btn.draggable = false
        selectors.appendChild(select_btn)
        //Create upload buttons
        let upload_btn = document.createElement("img")
        upload_btn.classList.add("upload-button")
        upload_btn.id = "upload_button_mask_"+i.toString()
        upload_btn.src = "assets/upload.svg"
        upload_btn.draggable = false
        let upload_input = document.createElement("input")
        upload_input.style.display = "none"
        upload_input.id = "upload_button_"+i.toString()
        upload_input.type = "file"
        upload_input.accept = "audio/*"
        uploads.appendChild(upload_btn)
        uploads.appendChild(upload_input)

    }

    //Finally load the elements of the drum machine
    load_drum_machine_play_section()
}

//Create the synth play section
function create_synth_play_section() {
    clean_play_section()
    var p = document.querySelector(".play-section");

    //Add the keyboard section
    let keyboard = document.createElement("div")
    keyboard.classList.add("keyboard")
    keyboard.style.height = "90%"
    p.appendChild(keyboard)

    for(let i=0; i<NB_STEPS; i++){
        //Create columns of the grid (steps)
        let step = document.createElement("div")
        step.classList.add("step")

        //Add the keys for each step
        for(let i=0; i<12; i++){
            let note = document.createElement("div")
            note.classList.add("note");
            //Black notes
            if (i == 1 || i == 3 || i == 6 || i == 8 || i == 10){
                note.classList.add("black-note");
            }
            step.appendChild(note)
        }
        keyboard.appendChild(step)
    }

    //Finally load the elements of the synth
    load_synth_play_section()
}

//Create the synth knobs section
function create_synth_knobs_section() {
    var b = document.querySelector(".knobs-section");

    //Remove all previous sections
    while (b.firstChild) {
        b.firstChild.remove(); 
    }

    //Left section (which contains main and modulation section)
    let left = document.createElement("div")
    left.classList.add("left-knobs")
    b.appendChild(left)
    
    //Right section (which contains envelopes and upload/download section)
    let right = document.createElement("div")
    right.classList.add("right-knobs")
    b.appendChild(right)

    //Main section (osc1, osc2, lfo, mixer, lpf)
    let main = document.createElement("div")
    main.classList.add("main-section")
    left.appendChild(main)

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
        waveform_btn.style.marginBottom = "12px"
        waveform_btn.src = "assets/sawtooth-wave.svg"
        osc.appendChild(waveform_btn)
    
        let second_param_text = document.createElement("div")
        second_param_text.classList.add("text-button")
        if (osc_name == "osc_1") {
            var second_param_name = "pitch"
        } else if (osc_name == "osc_2") {
            var second_param_name = "pw"
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
        osc_vol_knob.style.marginBottom = "22px"
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

    let texts_lpf = ["cutoff", "resonance"]
    texts_lpf.forEach(text => {
        let text_knob = document.createElement("div")
        text_knob.classList.add("text-button")
        text_knob.textContent = text.toUpperCase()
        lpf.appendChild(text_knob)

        let knob = document.createElement("img")
        knob.id = "lpf_"+text+"_knob"
        knob.draggable = false
        if (text == "cutoff") {
            knob.classList.add("rotate-button")
            knob.style.marginBottom = "12px"
        } else {
            knob.classList.add("mini-rotate-button")
        }
        knob.src = "assets/knob.svg"
        lpf.appendChild(knob)
    })
    main.append(lpf)


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

    let params = ["osc1-2_freqMod", "osc2_pwMod", "lpf_lfoMod", "lpf_envMod"]
    let display_text = ["OSC 1-2 FREQ", "OSC 2 PWM", "LPF CUTOFF", "LPF ENVELOPE"]
    params.forEach((param, i) => {
        let block = document.createElement("div")
        block.id = param+"_block"
        mod_knobs.appendChild(block)

        let text = document.createElement("div")
        text.classList.add("text-button")
        text.textContent = display_text[i]
        block.appendChild(text)

        let knob = document.createElement("img")
        knob.id = param+"_knob"
        knob.draggable = false
        knob.classList.add("mini-rotate-button")
        knob.src = "assets/knob.svg"
        block.appendChild(knob)
    })

    left.appendChild(modulation)


    //Envelopes
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

    //Upload/download buttons
    let upload_download = document.createElement("div")
    upload_download.id = "upload_download_section"

    let texts = ["upload", "download"]
    texts.forEach(text => {
        let block = document.createElement("div")
        block.id = text+"_block"
        block.style.marginTop = "10%"
        upload_download.appendChild(block)

        let text_btn = document.createElement("div")
        text_btn.classList.add("text-button")
        text_btn.textContent = text.toUpperCase()+" CONFIG"
        block.appendChild(text_btn)

        let btn = document.createElement("img")
        btn.src = "assets/"+text+".svg"
        btn.id = text+"_btn"
        block.appendChild(btn)
    })

    let upload_btn = document.createElement("input")
    upload_btn.style.display = "none"
    upload_btn.id = "upload_input"
    upload_btn.type = "file"
    upload_btn.accept = ".json,application/json"
    upload_download.appendChild(upload_btn)

    right.appendChild(upload_download)

    //We should update the angle of each knob BEFORE actually connecting them to the parameters
    update_knobs_display()
}

//Function to call to update the display of knobs depending on the actual parameters
function update_knobs_display() {
    let knob_list = document.querySelectorAll('.rotate-button, .mini-rotate-button')

    knob_list.forEach(knob => {

        //BPM
        if (knob.id == "tempo_knob") {
            var param = BPM
            var interpol_method = inverse_linear_interpolation
            var bound_param = "bpm"
        }

        //Envelopes
        if (knob.id.includes("env_knob")) {
            let knob_id_splitted = knob.id.split('_')
            let setting = knob_id_splitted[0]
            let envelope = knob_id_splitted[1]
            var param = param_variables[envelope+"_env"][setting]
            var bound_param = setting
            var interpol_method = inverse_exp_interpolation
            if (setting == "sustain") {
                interpol_method = inverse_linear_interpolation
            }
        }

        //LFP
        if (knob.id.includes("lpf_")) {
            let setting = knob.id.split('_')[1]
            var param = lpf_param[setting]
            interpol_method = inverse_exp_interpolation
            var bound_param = "lpf_"+setting
        }

        //Mixer
        if (knob.id.includes("vol_knob")) {
            var bound_param = "osc1_vol"
            var interpol_method = inverse_linear_interpolation
            let element = knob.id.split('_')[0]
            var param = param_variables[element]["vol"]
        }

        //OSC
        if (knob.id.includes("waveform_selector")) {
            let osc = knob.id.split('_')[0]
            var waveform = param_variables[osc]["waveform"]
            if (osc == "lfo" && waveform == "square") {
                waveform = "pulse"
            }
            knob.src = "assets/"+waveform+"-wave.svg"
        } else if (knob.id.includes("osc")) {
            let element = knob.id.split('_')[0].split('-')[0]
            let setting = knob.id.split('_')[1]
            var param = param_variables[element][setting]
            var bound_param = element+"_"+setting
            var interpol_method = inverse_linear_interpolation
            if (setting == "freqMod") {
                interpol_method = inverse_exp_interpolation
            }
        }

        //LFO Rate
        if (knob.id == "lfo_rate_knob") {
            var bound_param = "lfo_rate"
            var interpol_method = inverse_exp_interpolation
            var param = lfo_param["frequency"]
        }

        //Apply the rotation with the variables defined above
        if (typeof param !== 'undefined') {
            let angle_value = interpol_method(
                param,
                SETTING_BOUNDS[bound_param][0],
                SETTING_BOUNDS[bound_param][1]
            )
            display_rotate_knob(knob, angle_value)
        }

    })
}

//Display synth highlighted notes
function display_all_highlight_notes(){
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

//Apply colors to octave buttons depending on the current octave
function update_octave_buttons(){
    let octave_colors = {
        0: ["#d40000", ""],
        1: ["#d47600", ""],
        2: ["#e9e302", ""],
        3: ["", ""],
        4: ["", "#e9e302"],
        5: ["", "#d47600"],
        6: ["", "#d40000"]
    }
    document.getElementById('octave_down').style.backgroundColor = octave_colors[OCTAVE][0]
    document.getElementById('octave_up').style.backgroundColor = octave_colors[OCTAVE][1]
}

//Change appearance of the play button depending on the play state
function update_play_button(){
    let play_button = document.getElementById("play_button")
    if (PLAY == 0){ //Not playing
        play_button.style.backgroundColor = ""
        play_button.src = "assets/play.svg"
    } else { //Playing
        play_button.style.backgroundColor = "#d47600"
        play_button.src = "assets/pause.svg"
    }
}

//Change appearance of the waveforms selectors depending on the selected waveform
function update_osc_waveform_button(osc_name) {
    let params = param_variables[osc_name]
    let waveform_btn = document.getElementById(osc_name+"_waveform_selector")
    let new_waveform = params["waveform"]
    waveform_btn.src = "assets/"+new_waveform+"-wave.svg"
}








// -----------------------------------------------
// ----------------- CONTROLLER ------------------
// -----------------------------------------------
let intervalId = 0
let counter = 0

//4 functions to do math interpolation and their inverses
function linear_interpolation(x, y1, y2, x1=SETTING_BOUNDS["knobs_rotation"][0], x2=SETTING_BOUNDS["knobs_rotation"][1]) {
    return y1 + (x - x1) * (y2 - y1) / (x2 - x1);
}
function inverse_linear_interpolation(y, y1, y2, x1=SETTING_BOUNDS["knobs_rotation"][0], x2=SETTING_BOUNDS["knobs_rotation"][1]) {
    return x1 + ((x2 - x1) / (y2 - y1)) * (y - y1);
}
function exp_interpolation(x, y1, y2, x1=SETTING_BOUNDS["knobs_rotation"][0], x2=SETTING_BOUNDS["knobs_rotation"][1], k=2) {
    let t = (x - x1) / (x2 - x1);
    return y1 + (y2 - y1) * Math.pow(t, k);
}
function inverse_exp_interpolation(y, y1, y2, x1=SETTING_BOUNDS["knobs_rotation"][0], x2=SETTING_BOUNDS["knobs_rotation"][1], k=2) {
    let t = (y - y1) / (y2 - y1);
    return x1 + (x2 - x1) * Math.pow(t, 1/k);
}

//Make the buttons rotate
function knob_rotation(knob) {
    //Track the current rotation angle
    let currentRotation = get_knob_rotation(knob)

    //Listen for the wheel event to rotate the knob
    knob.addEventListener('wheel', (e) => {
        //Prevent default scroll behavior
        e.preventDefault()
    
        //Determine the scroll direction (wheel delta)
        const delta = e.deltaY;
    
        //Adjust rotation based on wheel movement
        let newRotation = currentRotation + (delta / 5)
    
        //Clamp the rotation to the bounds
        if (newRotation < SETTING_BOUNDS["knobs_rotation"][0]) {
            newRotation = SETTING_BOUNDS["knobs_rotation"][0]
        } else if (newRotation > SETTING_BOUNDS["knobs_rotation"][1]) {
            newRotation = SETTING_BOUNDS["knobs_rotation"][1]
        }
    
        //Update the current rotation for future calculations
        currentRotation = newRotation
    
        //Apply the new rotation to the knob
        display_rotate_knob(knob, currentRotation)

        //Update the value of the desired parameter by calling the appropriate function        
        if (knob.id.includes("env_")){
            let knob_id_splitted = knob.id.split('_')
            let env = knob_id_splitted[1]
            let setting = knob_id_splitted[0]
            if (knob_id_splitted[0] == "sustain") {
                var interpol_method = linear_interpolation
            } else {
                var interpol_method = exp_interpolation
            }
            change_envelope_settings(env, setting, currentRotation, interpol_method)
        }

        if (knob.id == "tempo_knob") {
            change_bpm(currentRotation)
        }

        if (knob.id.includes("osc") && knob.id.includes("knob")) {
            let osc_name = knob.id.split('_')[0].split('-')[0]
            let setting = knob.id.split('_')[1]
            change_osc_settings(osc_name, setting, currentRotation)
        }

        if (knob.id.includes("lpf_")) {
            let setting = knob.id.split('_')[1]
            change_lpf_settings(setting, currentRotation)
        }

        if(knob.id == "lfo_rate_knob") {
            change_lfo_rate(currentRotation)
        }

    });
}

//Get the angle of a knob
function get_knob_rotation(knob){
    var st = window.getComputedStyle(knob, null);
    var tm = st.getPropertyValue("transform") || "none";
    if (tm != "none") {
      var values = tm.split('(')[1].split(')')[0].split(',');
      return Math.round(Math.atan2(values[1],values[0]) * (180/Math.PI));
    }
    return 0;
}

//Load the drum machine play section
function load_drum_machine_play_section() {
    //Keys click
    const keys = document.querySelectorAll(".key")
    keys.forEach((key, index) => {
        key.addEventListener('click', function() {

            //Play mode
            if (EDIT == -1) { //Play mode
                one_led_on(key.children[0])
                if(MODE == 0){
                    play_sample(index)
                }
            } else { //Edit mode
                edit_sample_seq(index, EDIT)
                //Play the sample only if it has been activated (not deactivated)
                // and the sequence is not playing
                if (sample_seqs[EDIT][index] == 1 && PLAY == 0) {
                    play_sample(EDIT)
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

    //Upload buttons
    for (let i=0; i<NB_STEPS; i++) {
        let upload_btn_mask = document.getElementById('upload_button_mask_'+i.toString());
        let upload_btn = document.getElementById('upload_button_'+i.toString())
        upload_btn_mask.addEventListener('click', function() {
            upload_btn.click()
        })
        upload_btn.addEventListener('change', async function(event) {
            const file = event.target.files[0];  // Get the selected file
            if (file) {
                samples[i] = await load_audio_file(file);
            } else {
                console.error('No file selected');
            }
        });
    }
}

//Load the synth play section
function load_synth_play_section() {
    //Notes click
    const notes = document.querySelectorAll(".note")
    notes.forEach((note, index) => {
        note.addEventListener('click', function() {
            let true_idx = NB_STEPS*12*OCTAVE + index
            
            if (notes_seqs[true_idx] == 0) {
                notes_seqs[true_idx] = 1
                play_note(true_idx)
            } else {
                notes_seqs[true_idx] = 0
            }
        
            display_all_highlight_notes()
        })
    })
}

//Load knobs section
function load_synth_knobs_section() {

    //Waveform selectors
    let waveform_buttons = []
    waveform_buttons.push(document.getElementById("osc1_waveform_selector"))
    waveform_buttons.push(document.getElementById("osc2_waveform_selector"))
    waveform_buttons.push(document.getElementById("lfo_waveform_selector"))

    waveform_buttons.forEach(button => {
        let osc = button.id.split('_')[0]
        button.addEventListener('click', function() {
            change_osc_settings(osc, "waveform")
        })
    })

    //All knobs except tempo knob and waveform selectors
    let knob_list = document.querySelectorAll('#lpf_cutoff_knob, .mini-rotate-button')
    knob_list.forEach(knob => {
        knob_rotation(knob)
    })

    //Upload/download buttons
    let download_btn = document.getElementById("download_btn")
    download_btn.addEventListener('click', function() {
        export_data()
    })

    let upload_btn = document.getElementById("upload_btn")
    let upload_input = document.getElementById("upload_input")
    upload_btn.addEventListener('click', function() {
        upload_input.click()
    })
    upload_input.addEventListener('change', function(event) {
        const file = event.target.files[0]; // Get the selected file
        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            
            // On load, parse the JSON file
            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result); // Parse JSON string into object
                    import_data(jsonData)
                } catch (err) {
                    console.error("Error parsing JSON:", err);
                }
            };

            // Read the file as a text string
            reader.readAsText(file);
        } else {
            console.error("Please select a valid JSON file.");
        }
    })
}


function change_bpm(value, angle=true) {
    var new_value = value
    if (angle) {
        new_value = linear_interpolation(
            value, 
            SETTING_BOUNDS["bpm"][0],
            SETTING_BOUNDS["bpm"][1]
        )
    }
    BPM = Math.round(new_value)
    change_screen_display(BPM)
}


function change_osc_settings(osc_name, setting, value=null, angle=true) {
    let params = param_variables[osc_name]
    let new_value = value
    if (osc_name !== "lfo") {
        var osc_list = param_variables[osc_name+"_list"]
    }

    //Waveform
    if (setting == "waveform") {
        let waveforms = ["sawtooth", "triangle", "pulse", "sine"]
        let waveform_index = waveforms.indexOf(params["waveform"])
        let new_waveform = waveforms[(waveform_index+1) % waveforms.length]
        params["waveform"] = new_waveform
        
        if (osc_name == "osc1" || osc_name == "osc2"){
            osc_list.forEach((osc, i) => {
                osc.oscillator.type = new_waveform
                if (osc_name == "osc2") { //If it is osc2 then update pulse width params
                    if (new_waveform == "pulse") {
                        osc.oscillator.width.value = params["pw"]
                        osc2_pwm_scales[i].connect(osc.oscillator.width)
                    }
                }

            })
        } else if (osc_name == "lfo"){
            //If new_waveform == "pulse" just change to "square" as Tone.LFO
            // object doesn't have pulse type of waveform
            if (new_waveform == "pulse") {
                lfo.type = "square"
            } else {
                lfo.type = new_waveform
            }
        }
        update_osc_waveform_button(osc_name)
    }

    //Volume
    else if (setting == "vol") {
        if (angle) {
            new_value = linear_interpolation(
                value, 
                SETTING_BOUNDS["osc1_vol"][0],
                SETTING_BOUNDS["osc1_vol"][1]
            )
        }

        params["vol"] = new_value
        osc_list.forEach(osc => {
            osc.volume.value = convert_to_db(new_value)
        })
    }

    //Frequency modulation
    else if (setting == "freqMod") {
        if (angle) {
            new_value = exp_interpolation(
                value, 
                SETTING_BOUNDS["osc1_freqMod"][0],
                SETTING_BOUNDS["osc1_freqMod"][1]
            )
        }

        osc1_param["freqMod"] = new_value
        osc2_param["freqMod"] = new_value
    }

    //Pitch, Pulse Width and PWM
    else if (setting == "pitch" || setting == "pw" || setting == "pwMod") {
        if (angle) {
            new_value = linear_interpolation(
                value, 
                SETTING_BOUNDS[osc_name+"_"+setting][0],
                SETTING_BOUNDS[osc_name+"_"+setting][1]
            )
        }

        params[setting] = new_value

        if (setting == "pitch") { //Update OSC1 detune
            oscillators1.forEach(osc => {
                osc.detune.value = new_value
            })
        } else if (setting == "pw") { //Update PWM scale in case of PW setting change
            osc2_pwm_scales.forEach(scale => {
                scale.min = new_value - osc2_param["pwMod"]
                scale.max = new_value + osc2_param["pwMod"]

            })
        } else { //Update PWM scale in case of PWM setting change
            osc2_pwm_scales.forEach(scale => {
                scale.min = osc2_param["pw"] - new_value
                scale.max = osc2_param["pw"] + new_value
            })
        }
    }

}


function change_envelope_settings(env, setting, value, interpol_method=linear_interpolation, angle=true) {
    var new_value = value
    if (angle) {
        new_value = interpol_method(
            value, 
            SETTING_BOUNDS[setting][0],
            SETTING_BOUNDS[setting][1]
        )
    }
    
    if (env == "filter") {
        filt_envelope_param[setting] = new_value

        //Update the envelope for the filter
        lpf_envelope.attack = filt_envelope_param["attack"]
        lpf_envelope.decay = filt_envelope_param["decay"]
        lpf_envelope.sustain = filt_envelope_param["sustain"]
        lpf_envelope.release = filt_envelope_param["release"]

    } else if (env == "amplifier") {
        amp_envelope_param[setting] = new_value

        //Update the envelope for all the oscillators
        let osc_lists = [oscillators1, oscillators2]
        osc_lists.forEach(oscillators => {
            oscillators.forEach(osc => {
                osc.envelope.attack = amp_envelope_param["attack"]
                osc.envelope.decay = amp_envelope_param["decay"]
                osc.envelope.sustain = amp_envelope_param["sustain"]
                osc.envelope.release = amp_envelope_param["release"]
            })
        })
    }

}


function change_lfo_rate(value, angle=true) {
    var new_value = value
    if (angle) {
        new_value = exp_interpolation(
            value, 
            SETTING_BOUNDS["lfo_rate"][0],
            SETTING_BOUNDS["lfo_rate"][1],
        )
    }

    lfo_param["frequency"] = new_value
    lfo.frequency.value = new_value
}


function change_lpf_settings(setting, value, interpol_method=exp_interpolation, angle=true) {
    var new_value = value
    if (angle) {
        new_value = interpol_method(
            value, 
            SETTING_BOUNDS["lpf_"+setting][0],
            SETTING_BOUNDS["lpf_"+setting][1],
        )
    }

    lpf_param[setting] = new_value

    if (setting == "cutoff") {
        lpf.frequency.value = new_value
        lpf_lfo.min = new_value
        lpf_lfo.max = new_value+lpf_param["lfoMod"] //We shift the max modulation value
        lpf_env_scale.min = new_value
        lpf_env_scale.max = new_value+lpf_param["envMod"] //Same
    } else if (setting == "resonance") {
        lpf.Q.value = new_value
    } else if (setting == "lfoMod") {
        lpf_lfo.max = lpf_param["cutoff"]+new_value
    } else if (setting == "envMod") {
        lpf_env_scale.max = lpf_param["cutoff"]+new_value
    }
}

//Start the sequencer
function play_seq() {
    let cur_BPM = BPM
    intervalId = setInterval(function incr() {
        //If the BPM changes during playing, the interval is restarted
        if (cur_BPM != BPM) {
            clearInterval(intervalId)
            play_seq()
        }
        render_step_leds()

        //Play the drum machine samples of the current step and render the leds
        for(let i=0; i<sample_seqs.length; i++){
            if (sample_seqs[i][counter] == 1){
                play_sample(i)
                if (EDIT == -1 && MODE == 0) {
                    let sample_leds = document.querySelectorAll(".led")
                    one_led_on(sample_leds[i])
                }
            }
        }
    
        //Play the notes of the current step
        play_step_notes(counter)
        
        counter = (counter+1) % NB_STEPS
    }, (60/BPM)/4*1000)
}

//Stop the sequencer (clear leds and timers)
function stop_seq() {
    clearInterval(intervalId)
    stop_all_timers()
    all_step_led_off()
    if (EDIT == -1){
        all_sample_led_off()
    }
    counter = 0
}

//Edit the sequence of samples
function edit_sample_seq(key_index, sample_index) {
    sample_seqs[sample_index][key_index] = 1 - sample_seqs[sample_index][key_index]
    render_leds_edit(sample_index)
}

//Switch between play mode and edit mode
function toggle_edit_mode(index) {
    all_sample_led_off()
    if(EDIT == index || index == -1){
        EDIT = -1
    }else{
        EDIT = index
        render_leds_edit(EDIT)
    }
    render_select_buttons()
}

//Change octave
function change_octave(nb){
    if(OCTAVE+nb >= 0 && OCTAVE+nb <= 6){
        OCTAVE += nb
        update_octave_buttons()
        display_all_highlight_notes()
    }
}

//Play a sample in the buffer
function play_sample(sample_index){
    if (samples[sample_index] !== null) {
        const source = audio_context.createBufferSource()
        source.buffer = samples[sample_index]
        source.connect(audio_context.destination)
        source.start(0)
    }
}

//Function to be called when ONLY ONE NOTE must be played
function play_note(key_index, osc_idx=0) {

    let note = convert_to_note_and_octave(key_index)

    //Define the OSC that will be used to reproduce the note
    let osc1 = oscillators1[osc_idx]
    let osc2 = oscillators2[osc_idx]

    //Define the LFO scales that will be used for pitch modulation
    let osc1_lfo_scale = osc1_lfo_scales[osc_idx]
    let osc2_lfo_scale = osc2_lfo_scales[osc_idx]

    //Compute the range of the LFO pitch modulation
    let note_freq = Tone.Frequency(note).toFrequency()

    osc1_lfo_scale.min = note_freq - osc1_param["freqMod"]
    osc1_lfo_scale.max = note_freq + osc1_param["freqMod"]
    osc2_lfo_scale.min = note_freq - osc2_param["freqMod"]
    osc2_lfo_scale.max = note_freq + osc2_param["freqMod"]

    //Trigger the filter envelope
    lpf_envelope.triggerAttackRelease((60/BPM)/4 - 0.002)

    //Trigger the oscillators
    // the note is maximum one step duration
    osc1.triggerAttackRelease(note, (60/BPM)/4 - 0.002)
    osc2.triggerAttackRelease(note, (60/BPM)/4 - 0.002)
}

//Function to be called when MULTIPLE notes must be played
function play_step_notes(step_nb){

    //First get all the index of the activated notes in this step
    let triggered_notes_idx = []
    for (let j=0; j<MAX_OCTAVE; j++){
        for (let i=step_nb*12; i<step_nb*12+12; i++) {

            //Current index
            let true_idx = j*12*NB_STEPS + i

            //If this note is activated
            // and the nb of triggered notes is < NB_VOICES_POLYPHONY,
            if (notes_seqs[true_idx] == 1 && triggered_notes_idx.length < NB_VOICES_POLYPHONY) {
                // add this index to the list of triggered notes
                triggered_notes_idx.push(true_idx)
            }
        }
    }

    //Finally call the play_note function for each note of the step
    // with different oscillators
    for (let i=0; i<triggered_notes_idx.length; i++) {
        play_note(triggered_notes_idx[i], i)
    }
}

//Convert a note index to a note like C4 or D6
function convert_to_note_and_octave(key_index){
    let chroma_scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    let note = chroma_scale[key_index % 12]
    let octave = Math.floor(key_index / (12*NB_STEPS))
    return note+octave.toString()
}

//dB conversion
function convert_to_db(value) {
    return 20*Math.log10(value+Number.MIN_VALUE)
}

//Load an audio file and return a buffer containing the audio data
async function load_audio_file(file) {
    try {
        //If the path to the file is provided
        if (typeof file === 'string' || file instanceof String) {
            let response = await fetch(file);
            var arrayBuffer = await response.arrayBuffer();

        //Else if the file object is directly provided
        } else {
            var arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject('Error reading file');
                reader.readAsArrayBuffer(file);
            });
        }

        const buffer = await audio_context.decodeAudioData(arrayBuffer);
        return buffer;

    } catch (error) {
        console.error('Error loading or decoding audio file:', error);
    }
}

//Export synth and drum machine config in a JSON file
function export_data() {
    const data = {
        bpm: BPM,
        osc1: osc1_param,
        osc2: osc2_param,
        lpf: lpf_param,
        lfo: lfo_param,
        amp_envelope: amp_envelope_param,
        filter_envelope: filt_envelope_param,
        drum_machine_array: sample_seqs,
        synth_array: notes_seqs
    }
    const jsonData = JSON.stringify(data, null, 2)

    const blob = new Blob([jsonData], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data.json';  // Name of the downloaded file
    link.click();
}

//Import synth and drum machine from a JSON file
function import_data(jsonData) {
    try {
        BPM = jsonData.bpm
        osc1_param = jsonData.osc1
        osc2_param = jsonData.osc2
        lpf_param = jsonData.lpf
        lfo_param = jsonData.lfo
        amp_envelope_param = jsonData.amp_envelope
        filt_envelope_param = jsonData.filter_envelope
        sample_seqs = jsonData.drum_machine_array
        notes_seqs = jsonData.synth_array

        load_synth_elements()

        //Apply needed changes
        change_bpm(BPM, false)

        let settings = ["pitch", "pw", "pwMod", "vol", "vol", "freqMod"]
        let corr_osc = ["osc1", "osc2", "osc2", "osc1", "osc2", "osc1"]
        settings.forEach((setting, i) => {
            let osc_name = corr_osc[i]
            let params = param_variables[osc_name]
            change_osc_settings(osc_name, setting, params[setting], false)
        })
        
        change_lpf_settings("lfoMod", lpf_param["lfoMod"], linear_interpolation, false)

        for (let i=0; i<oscillators2.length; i++) {
            //Connect PWM if needed
            if (osc2_param["waveform"] == "pulse") {
                oscillators2[i].oscillator.width.value = osc2_param["pw"]
                osc2_pwm_scales[i].connect(oscillators2[i].oscillator.width)
            }
        }

        //Update knobs display and reload them
        create_synth_knobs_section()
        load_synth_knobs_section()

        //Update play section rendering
        toggle_edit_mode(-1)
        if (MODE == 1) {
            display_all_highlight_notes()
        }

    } catch(error) {
        console.error("Error when importing data:", error)
        alert("Error when importing data")
    }
}