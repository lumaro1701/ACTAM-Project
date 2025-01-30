import "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"


//Waiting for the HTML content to be loaded
document.addEventListener('click', function() {

    if (Tone.context.state !== 'running') {
        Tone.start()

        //Creation of the keys of the drum machine
        synth_section()

        //Creation of the synth knobs
        synth_controls_section()

        //Correctly rotates the knobs
        update_knobs_display()

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

        load_synth_elements()
    }

});






//-----MODEL-----
let counter = 0

//Min BPM, max BPM and starting BPM
let BPM = 120

//Rotative buttons range limits
const MIN_ROTATION = -145;
const MAX_ROTATION = 145;

//Play mode (drum machine or synth)
let mode = 1
//Play state
let play = 0
//Edit state
let edit_mode = -1

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

//Paths to samples for the drum machine
const sample_paths = [
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
    bpm: [20, 250],
    attack: [0.0, 2.0],
    decay: [0.0, 2.0],
    sustain: [0.0, 1.0],
    release: [0.0, 5.0],
    osc_volume: [0.0, 1.0],
    osc_mod_amt: [0, 500],
    osc1_pitch: [-1200, 1200],
    osc2_pulse_width: [-1, 1],
    osc2_pwm: [0, 0.5],
    lfo_rate: [0.1, 20.0],
    lpf_cutoff: [1, 20000],
    lpf_resonance: [0, 15],
    lpf_mod_amt: [0, 15000],
    lpf_env_amt: [0, 15000],
}


let osc1_param = {
    waveform: "sawtooth",
    volume: 1,
    mod_amt: 0,
    pitch: 0,
};

let osc2_param = {
    waveform: "sawtooth",
    volume: 1,
    mod_amt: osc1_param["mod_amt"],
    pulse_width: 0,
    pwm: 0,
};

let lfo_param = {
    waveform: "sine",
    frequency: 10,
};

let lpf_param = {
    type: "lowpass",
    cutoff: 20000,
    rolloff: -24,
    resonance: 0,
    mod_amt: 0,
    env_amt: 0,
}

let amp_envelope_param = {
    attack: 0.001,
    decay: 0.5,
    sustain: 0,
    release: 0.2,
};

let filt_envelope_param = {
    attack: 0.001,
    decay: 0.1,
    sustain: 0.5,
    release: 0.2,
};


//This event ensures that all the audio contexts are loaded
// after a user event, preventing some JS warnings
document.addEventListener('click', function() {

    if (Tone.context.state !== 'running') {
        Tone.start()
        load_synth_elements()
    }
})

function load_synth_elements() {
    //Create filter (LPF)
    window.lpf = new Tone.Filter({
        type: lpf_param["type"],
        frequency: lpf_param["cutoff"],
        rolloff: lpf_param["rolloff"],
        Q: lpf_param["resonance"]
    }).toDestination();

    //Create filter envelope
    window.lpf_envelope = new Tone.Envelope({
        curve: "exponential",
        attack: filt_envelope_param["attack"],
        decay: filt_envelope_param["decay"],
        sustain: filt_envelope_param["sustain"],
        release: filt_envelope_param["release"],
    })


    //Scale the filter envelope and connect it to the filter's frequency
    window.lpf_env_scale = new Tone.Scale(lpf_param["cutoff"], lpf_param["cutoff"]+lpf_param["env_amt"])
    lpf_envelope.connect(lpf_env_scale)
    lpf_env_scale.connect(lpf.frequency)


    //Create LFO
    window.lfo = new Tone.LFO({
        type: lfo_param["waveform"],
        min: -1,
        max: 1,
        frequency: lfo_param["frequency"],
    }).start()


    //Connect LFO to LPF for cutoff frequency modulation
    window.lpf_lfo = new Tone.Scale(lpf_param["cutoff"], lpf_param["cutoff"]+lpf_param["mod_amt"])
    lfo.connect(lpf_lfo)
    lpf_lfo.connect(lpf.frequency)


    //Create oscillators and connect them to the filter
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
            var osc = new Tone.Synth({
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
            })            
            //Connect LFO to OSCs for pitch modulation
            let osc_lfo_scale = new Tone.Scale(0, 0)
            lfo.connect(osc_lfo_scale)
            osc_lfo_scale.connect(osc.frequency)

            //Create but don't connect LFO to OSC2 for PWM yet
            if (i == 1) {
                let pwm_scale = new Tone.Scale(osc2_param["pwm"], osc2_param["pwm"])
                lfo.connect(pwm_scale)
                osc2_pwm_scales.push(pwm_scale)
            }

            //Connect OSC to the LPF
            osc.connect(lpf);

            //Push the newly created objects into their respective lists
            osc_lfo_scales_list[i].push(osc_lfo_scale)
            osc_lists[i].push(osc)
        }
    }
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


function display_rotate_knob(knob, rotation_angle) {
    knob.style.transform = `rotate(${rotation_angle}deg)`;
}


function get_knob_rotation(knob){
    var st = window.getComputedStyle(knob, null);
    var tm = st.getPropertyValue("transform") ||
             "none";
    if (tm != "none") {
      var values = tm.split('(')[1].split(')')[0].split(',');
      return Math.round(Math.atan2(values[1],values[0]) * (180/Math.PI));
    }
    return 0;
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
        e = document.createElement("img")
        e.classList.add("select-button")
        //e.textContent = "S"
        e.src = "assets/edit.svg"
        e.draggable = false
        s.appendChild(e)
        //Create step leds
        step_led = document.createElement("div")
        step_led.classList.add("step-led")
        leds.appendChild(step_led)

    }

    //Finally load the elements of the drum machine
    load_drum_machine_play_section()
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
            var second_param_name = "pulse_width"
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
    cutoff_btn_lpf.id = "lpf_cutoff_knob"
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
    res_btn_lpf.id = "lpf_resonance_knob"
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

    let params = ["osc_freq", "pwm", "lpf_cutoff", "lpf_envelope"]
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

    update_knobs_display()
    load_synth_button_section()
}


function update_knobs_display() {
    let knob_list = document.querySelectorAll('.rotate-button, .mini-rotate-button')

    knob_list.forEach(knob => {

        //BPM
        if (knob.id == "tempo_button") {
            var param = BPM
            var interpol_method = inverse_linear_interpolation
            var bound_param = "bpm"
        }

        //Envelopes
        if (knob.id.includes("_env_knob")) {
            let knob_id_splitted = knob.id.split('_')
            let setting = knob_id_splitted[0]
            let envelope = knob_id_splitted[1]
            if (envelope == "filter") {
                var params = filt_envelope_param
            } else if (envelope == "amplifier") {
                var params = amp_envelope_param
            }
            if (setting == "sustain") {
                var interpol_method = inverse_linear_interpolation
            } else {
                var interpol_method = inverse_exp_interpolation
            }
            var param = params[setting]
            var bound_param = setting
        }

        //LFP
        if (knob.id == "lpf_cutoff_knob" || knob.id == "lpf_resonance_knob") {
            let setting = knob.id.split('_')[1]
            var param = lpf_param[setting]
            var interpol_method = inverse_exp_interpolation
            var bound_param = "lpf_"+setting
        } else if (knob.id == "lpf_cutoff_mod_knob") {
            let setting = "mod_amt"
            var param = lpf_param[setting]
            var interpol_method = inverse_exp_interpolation
            var bound_param = "lpf_"+setting
        } else if (knob.id == "lpf_envelope_mod_knob") {
            let setting = "env_amt"
            var param = lpf_param[setting]
            var interpol_method = inverse_exp_interpolation
            var bound_param = "lpf_"+setting
        }

        //Mixer
        if (knob.id.includes("vol_knob")) {
            var bound_param = "osc_volume"
            var interpol_method = inverse_linear_interpolation
            if (knob.id.split('_')[0] == "osc1") {
                param = osc1_param["volume"]
            } else {
                param = osc2_param["volume"]
            }
        }

        //OSC
        if (knob.id.includes("waveform_selector")) {
            let osc = knob.id.split('_')[0]
            if (osc == "osc1") {
                var waveform = osc1_param["waveform"]
            } else if (osc == "osc2") {
                var waveform = osc2_param["waveform"]
            } else {
                var waveform = lfo_param["waveform"]
                if (waveform == "square") {
                    waveform = "pulse"
                }
            }
            knob.src = "assets/"+waveform+"-wave.svg"
        } else if (knob.id == "osc1_pitch_knob") {
            var bound_param = "osc1_pitch"
            var interpol_method = inverse_linear_interpolation
            var param = osc1_param["pitch"]
        } else if (knob.id == "osc2_pulse_width_knob") {
            var bound_param = "osc2_pulse_width"
            var interpol_method = inverse_linear_interpolation
            var param = osc2_param["pulse_width"]
        } else if (knob.id == "osc_freq_mod_knob") {
            var bound_param = "osc_mod_amt"
            var interpol_method = inverse_exp_interpolation
            var param = osc1_param["mod_amt"]
        } else if (knob.id == "pwm_mod_knob") {
            var bound_param = "osc2_pwm"
            var interpol_method = inverse_linear_interpolation
            var param = osc2_param["pwm"]
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
                MIN_ROTATION,
                MAX_ROTATION,
                SETTING_BOUNDS[bound_param][0],
                SETTING_BOUNDS[bound_param][1]
            )
            display_rotate_knob(knob, angle_value)
        }

    })
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

function inverse_exp_interpolation(y, x1, x2, y1, y2, k=2) {
    let t = (y - y1) / (y2 - y1);
    return x1 + (x2 - x1) * Math.pow(t, 1/k);
}


function knob_rotation(knob) {
    //let currentRotation = 0; //Track the current rotation angle
    let currentRotation = get_knob_rotation(knob)

    //Listen for the wheel event to rotate the knob
    knob.addEventListener('wheel', (e) => {
        //Prevent default scroll behavior
        e.preventDefault()
    
        //Determine the scroll direction (wheel delta)
        const delta = e.deltaY; //Positive for scrolling down, negative for scrolling up
    
        //Adjust rotation based on wheel movement
        let newRotation = currentRotation + (delta / 5) //Adjust speed here by changing divisor
    
        //Clamp the rotation to the bounds
        if (newRotation < MIN_ROTATION) {
            newRotation = MIN_ROTATION
        } else if (newRotation > MAX_ROTATION) {
            newRotation = MAX_ROTATION
        }
    
        //Update the current rotation for future calculations
        currentRotation = newRotation
    
        //Apply the new rotation to the knob
        display_rotate_knob(knob, currentRotation)

        //Update the value of the desired parameter by calling the appropriate function        
        if (knob.id.includes("env_")){
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

        //The following blocks connect the buttons to their respective functions
        if (knob.id.includes("tempo")) {
            change_bpm(currentRotation)
        }

        if (knob.id.includes("vol_knob")) {
            let knob_id_splitted = knob.id.split('_')
            change_osc_vol(knob_id_splitted[0], currentRotation)
        }

        if (knob.id.includes("lpf_")) {
            if (knob.id == "lpf_cutoff_mod_knob") {
                change_lpf_settings("mod_amt", currentRotation)
            } else if (knob.id == "lpf_envelope_mod_knob") {
                change_lpf_settings("env_amt", currentRotation)
            } else {
                let knob_id_splitted = knob.id.split('_')
                change_lpf_settings(knob_id_splitted[1], currentRotation)
            }
        }

        if(knob.id == "lfo_rate_knob") {
            change_lfo_rate(currentRotation)
        }

        if (knob.id == "osc_freq_mod_knob") {
            change_osc_freq_modulation(currentRotation)
        }

        if (knob.id == "pwm_mod_knob") {
            change_osc2_pwm(currentRotation)
        }

        if (knob.id == "osc1_pitch_knob") {
            change_osc1_pitch(currentRotation)
        }

        if (knob.id == "osc2_pulse_width_knob") {
            change_osc2_pulse_width(currentRotation)
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

    //LFO rate
    let lfo_rate_knob = document.getElementById("lfo_rate_knob")
    knob_rotation(lfo_rate_knob)

    //OSC1 pitch
    let osc1_pitch = document.getElementById("osc1_pitch_knob")
    knob_rotation(osc1_pitch)

    //OSC2 duty cucle
    let osc2_pulse_width = document.getElementById("osc2_pulse_width_knob")
    knob_rotation(osc2_pulse_width)

    //Envelopes knobs
    let settings_env = ["attack", "decay", "sustain", "release"]
    let envelopes = ["filter", "amplifier"]

    envelopes.forEach(env => {
        settings_env.forEach(setting => {
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

    //LPF knobs
    let settings_lpf = ["cutoff", "resonance"]
    settings_lpf.forEach(setting => {
        let element = document.getElementById("lpf_"+setting+"_knob")
        knob_rotation(element)
    })

    //Modulation knobs
    let mod_knobs_ids = ["lpf_cutoff_mod_knob", "lpf_envelope_mod_knob", "osc_freq_mod_knob", "pwm_mod_knob"]
    mod_knobs_ids.forEach(knob_id => {
        let element = document.getElementById(knob_id)
        knob_rotation(element)
    })
}


function change_bpm(value) {
    let new_value = linear_interpolation(
        value, 
        MIN_ROTATION, 
        MAX_ROTATION, 
        SETTING_BOUNDS["bpm"][0],
        SETTING_BOUNDS["bpm"][1]
    )
    BPM = Math.round(new_value)
    change_screen_display(BPM)
}


function change_osc_waveform(osc) {
    let waveforms = ["sawtooth", "triangle", "pulse", "sine"]
    if (osc == 1){
        let index = waveforms.indexOf(osc1_param["waveform"]);
        let new_waveform = waveforms[(index+1) % waveforms.length]
        osc1_param["waveform"] = new_waveform
        oscillators1.forEach(osc => {
            osc.oscillator.type = new_waveform
        })
    }
    if (osc == 2){
        let index = waveforms.indexOf(osc2_param["waveform"]);
        let new_waveform = waveforms[(index+1) % waveforms.length]
        osc2_param["waveform"] = new_waveform
        for (let i=0; i<oscillators2.length; i++) {
            oscillators2[i].oscillator.type = new_waveform
            //Update duty cycle and connect/disconnect PWM
            if (new_waveform == "pulse") {
                oscillators2[i].oscillator.width.value = osc2_param["pulse_width"]
                osc2_pwm_scales[i].connect(oscillators2[i].oscillator.width)
            } else if (waveforms[index] == "pulse") { //If current waveform is "pulse"
                osc2_pwm_scales[i].disconnect(oscillators2[i].oscillator.width)
            }
            //Update waveform
        }
    }
    //LFO
    if (osc == 3){
        let index = waveforms.indexOf(lfo_param["waveform"]);
        let new_waveform = waveforms[(index+1) % waveforms.length]
        lfo_param["waveform"] = new_waveform
        //If new_waveform == "pulse" just change to "square" as Tone.LFO
        // object doesn't have pulse type of waveform
        if (new_waveform == "pulse") {
            lfo.type = "square"
        } else {
            lfo.type = new_waveform
        }
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
        oscillators1.forEach(osc => {
            osc.volume.value = convert_to_db(new_value)
        })
    } else if (osc_name == "osc2") {
        osc2_param["volume"] = new_value
        oscillators2.forEach(osc => {
            osc.volume.value = convert_to_db(new_value)
        })
    }
}


function change_osc_freq_modulation(value) {
    let new_value = exp_interpolation(
        value, 
        MIN_ROTATION, 
        MAX_ROTATION, 
        SETTING_BOUNDS["osc_mod_amt"][0],
        SETTING_BOUNDS["osc_mod_amt"][1]
    )

    osc1_param["mod_amt"] = new_value
    osc2_param["mod_amt"] = new_value
}


function change_osc1_pitch(value) {
    let new_value = linear_interpolation(
        value, 
        MIN_ROTATION, 
        MAX_ROTATION, 
        SETTING_BOUNDS["osc1_pitch"][0],
        SETTING_BOUNDS["osc1_pitch"][1]
    )

    osc1_param["pitch"] = new_value
    oscillators1.forEach(osc => {
        osc.detune.value = new_value
    })
}

function change_osc2_pulse_width(value) {
    let new_value = linear_interpolation(
        value, 
        MIN_ROTATION, 
        MAX_ROTATION, 
        SETTING_BOUNDS["osc2_pulse_width"][0],
        SETTING_BOUNDS["osc2_pulse_width"][1]
    )

    osc2_param["pulse_width"] = new_value

    //Update the scale of the PWM
    osc2_pwm_scales.forEach(scale => {
        scale.min = new_value - osc2_param["pwm"]
        scale.max = new_value + osc2_param["pwm"]
    })

}

function change_osc2_pwm(value) {
    let new_value = linear_interpolation(
        value, 
        MIN_ROTATION, 
        MAX_ROTATION, 
        SETTING_BOUNDS["osc2_pwm"][0],
        SETTING_BOUNDS["osc2_pwm"][1]
    )

    osc2_param["pwm"] = new_value
    osc2_pwm_scales.forEach(scale => {
        scale.min = osc2_param["pulse_width"] - new_value
        scale.max = osc2_param["pulse_width"] + new_value
    })
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


function change_lfo_rate(value) {
    let new_value = exp_interpolation(
        value, 
        MIN_ROTATION,
        MAX_ROTATION,
        SETTING_BOUNDS["lfo_rate"][0],
        SETTING_BOUNDS["lfo_rate"][1],
    )

    lfo_param["frequency"] = new_value
    lfo.frequency.value = new_value
}


function change_lpf_settings(setting, value, interpol_method=exp_interpolation) {
    let new_value = interpol_method(
        value, 
        MIN_ROTATION,
        MAX_ROTATION,
        SETTING_BOUNDS["lpf_"+setting][0],
        SETTING_BOUNDS["lpf_"+setting][1],
    )

    lpf_param[setting] = new_value

    if (setting == "cutoff") {
        lpf.frequency.value = new_value
        lpf_lfo.min = new_value
        lpf_lfo.max = lpf_param["cutoff"]+lpf_param["mod_amt"] //We shift the max modulation value
        lpf_env_scale.min = new_value
        lpf_env_scale.max = lpf_param["cutoff"]+lpf_param["env_amt"] //Same
    } else if (setting == "resonance") {
        lpf.Q.value = new_value
    } else if (setting == "mod_amt") {
        lpf_lfo.max = lpf_param["cutoff"]+new_value
    } else if (setting == "env_amt") {
        lpf_env_scale.max = lpf_param["cutoff"]+new_value
    }
}


function change_screen_display(new_display) {
    let screen = document.getElementById("screen")
    screen.textContent = `${new_display}`
}


function play_seq() {
    intervalId = setInterval(function incr() {

        render_step_leds()

        //Play the drum machine samples of the current step and render the leds
        let sample_leds = document.querySelectorAll(".led")
        for(let i=0; i<sample_seqs.length; i++){
            if (sample_seqs[i][counter] == 1){
                play_sample(i)
                if (edit_mode == -1 && mode == 0) {
                    one_led_on(sample_leds[i])
                }
            }
        }
    
        //Play the notes of the current step
        play_step_notes(counter)
        
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
        document.querySelectorAll(".select-button")[index].style.backgroundColor = "#ff6a00"
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
    if(sample_index < sample_paths.length){
        //Loading audio samples in a buffer
        fetch(sample_paths[sample_index]).then(response => response.arrayBuffer()).then(buffer => audio_context.decodeAudioData(buffer)).then(buffer => {
            var track = audio_context.createBufferSource();
            track.buffer = buffer;
            track.connect(audio_context.destination);
            track.start(0);
        });
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

    osc1_lfo_scale.min = note_freq - osc1_param["mod_amt"]
    osc1_lfo_scale.max = note_freq + osc1_param["mod_amt"]
    osc2_lfo_scale.min = note_freq - osc2_param["mod_amt"]
    osc2_lfo_scale.max = note_freq + osc2_param["mod_amt"]

    //Trigger the filter envelope
    lpf_envelope.triggerAttackRelease((60/BPM)/4 - 0.002)

    //Trigger the oscillators
    // the note is maximum one step duration
    osc1.triggerAttackRelease(note, (60/BPM)/4 - 0.002, undefined)
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
            // add this index to the list of triggered notes
            if (notes_seqs[true_idx] == 1 && triggered_notes_idx.length < NB_VOICES_POLYPHONY) {
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



function convert_to_note_and_octave(key_index){
    let chroma_scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    let note = chroma_scale[key_index % 12]
    let octave = Math.floor(key_index / (12*NB_STEPS))
    return note+octave.toString()
}

function convert_to_db(value) {
    return 20*Math.log10(value+Number.MIN_VALUE)
}









/*
let samples = [];
for (let i=0; i<NB_STEPS; i++){
    samples.push(null)
}
let audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Web Audio context


document.addEventListener('DOMContentLoaded', function() {
    // Get the file input element and add an event listener
    const uploadButton = document.getElementById('uploadButton');

    uploadButton.addEventListener('change', handleFileUpload);
})

// Function to handle file upload
function handleFileUpload(event) {
  const file = event.target.files[0]; // Get the first file from the input (assuming only one file is uploaded at a time)

  if (file) {
    let reader = new FileReader();

    reader.onload = function(e) {
      const arrayBuffer = e.target.result; // Get the ArrayBuffer from the FileReader

      // Decode the audio data into an AudioBuffer
      audioContext.decodeAudioData(arrayBuffer, function(buffer) {
        // Successfully decoded, now push the buffer into the samples array
        samples[0] = buffer;
        console.log("Sample loaded and added to the samples array.");
      }, function(error) {
        console.error("Error decoding audio data:", error);
        alert("Failed to load the audio file.");
      });
    };

    // Read the file as an ArrayBuffer
    reader.readAsArrayBuffer(file);
  } else {
    console.log("No file selected");
  }
  console.log(samples)
}
*/