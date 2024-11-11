console.log("This is my drum machine");

//Waiting for the HTML content to be loaded
document.addEventListener('DOMContentLoaded', function() {

    //Creation of the keys
    drum_machine_section()

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
                play_sample(edit_mode)
            }
            
        })
    })

    //Mode drums/keyboard
    const mode_button = document.querySelector("#mode_button")
    mode_button.addEventListener('click', function() {
        switch_mode()
    })

    //Play/pause button
    const play_button = document.querySelector("#play_button")
    play_button.addEventListener('click', function() {

        if(play == 0){
            play_seq()
        }else{
            stop_seq()
        }
        play = 1 - play
    })

    //Selector and edit mode
    const selectors = document.querySelectorAll(".select-button")
    selectors.forEach((selector, index) => {
        selector.addEventListener('click', function (){
            toggle_edit_mode(index)
        })
    })

});



//-----MODEL-----
let counter = 0


let bpm = 120
let beat = 60/bpm

//Play mode (drum machine or synth)
let mode = 0
//Play state
let play = 0
//Edit state
let edit_mode = -1


let octave = 3

let nb_keys = 16

//Create the audio context
const audio_context = new AudioContext()

//Paths to samples for the drum machine
const samples = [
    "assets/kick.wav",
    "assets/snare.wav",
    "assets/closed_hihat.wav",
    "assets/open_hihat.wav",
    "assets/shaker.wav",
    "assets/fill.wav",
]

//2D array for the step sequencer
let sample_seqs = Array(nb_keys)
for(let i=0; i<sample_seqs.length; i++){
    sample_seqs[i] = Array(nb_keys)
    for(let j=0; j<nb_keys; j++){
        sample_seqs[i][j] = 0
    }
}



//-----VIEW-----
function switch_mode(){
    if (mode == 0){
        synth_section()
    }else{
        drum_machine_section()
    }
    toggle_edit_mode(-1)
    mode = 1 - mode
}

function one_led_on(led, keep_on=false) {
    led.classList.toggle("led-on");
    if (!keep_on) {
        setTimeout(function() {
            led.classList.toggle("led-on");
        }, beat/4*1000)
    }
}

function all_led_off() {
    let leds = document.querySelectorAll(".led")
    leds.forEach(led => led.classList.remove("led-on"))
}

function render() {
    let leds = document.querySelectorAll(".led")
    all_led_off()
    leds[counter].classList.add("led-on")
}

function render_leds_edit(edit_sample_index) {
    all_led_off()
    let steps_on = sample_seqs[edit_sample_index]
    let keys = document.querySelectorAll(".key")
    keys.forEach((key, index) => {
        if (steps_on[index] == 1){
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
    for(let i=0; i<nb_keys; i++){
        e = document.createElement("div")
        e.classList.add("key")
        l = document.createElement("div")
        l.classList.add("led")
        e.appendChild(l)
        k.appendChild(e)
        //Create selector
        e = document.createElement("div")
        e.classList.add("select-button")
        s.appendChild(e)
    }
}

function synth_section() {
    var p = document.querySelector(".play-section");

    //Remove all previous sections
    while (p.firstChild) {
        p.firstChild.remove(); 
    }

    //Add the keyboard section
    let k = document.createElement("div")
    k.classList.add("keyboard")
    p.appendChild(k)

    for(let i=0; i<nb_keys; i++){
        //Create columns of the grid (steps)
        let e = document.createElement("div")
        e.classList.add("step")

        //Add the keys for each step
        let n
        for(let i=0; i<12; i++){
            n = document.createElement("div")
            n.classList.add("note");
            e.appendChild(n)
        }
        document.querySelector(".keyboard").appendChild(e)
    }
}



//-----CONTROLLER-----
let intervalId = 0


function incr() {
    render()
    for(let i=0; i<sample_seqs.length; i++){
        if (sample_seqs[i][counter] == 1){
            play_sample(i)
        }
    }
    counter = (counter+1) % nb_keys
}

function play_seq() {
    intervalId = setInterval(incr, beat/4*1000)
    toggle_edit_mode(-1)
}

function stop_seq() {
    clearInterval(intervalId)
    all_led_off()
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
        all_led_off()
    }else{
        edit_mode = index
        render_leds_edit(edit_mode)
        document.querySelectorAll(".select-button")[index].style.backgroundColor = "#ff0000"
        //document.querySelectorAll(".select-button")[index].textContent = "S"
    }
}


function key_clicked(key, key_index) {
    one_led_on(key.children[0])
    if(mode == 0){
        play_sample(key_index)
    }else{
        play_note(key, key_index)
    }
}

function play_sample(sample_index){
    if(sample_index < samples.length){
        //Loading audio samples in a buffer
        var audioFile = fetch(samples[sample_index]).then(response => response.arrayBuffer()).then(buffer => audio_context.decodeAudioData(buffer)).then(buffer => {
            var track = audio_context.createBufferSource();
            track.buffer = buffer;
            track.connect(audio_context.destination);
            track.start(0);
        });
    }
}

function play_note(key, key_index) {
    let osc = audio_context.createOscillator()
    osc.connect(audio_context.destination)
    osc.frequency.setValueAtTime((32.70*2**(key_index/12+octave)), audio_context.currentTime)

    osc.start()
    setTimeout(function() {osc.stop()}, 200)
}