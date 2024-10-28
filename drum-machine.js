console.log("This is my drum machine");

bpm = 120
beat = 60/bpm

mode = 0
play = 0
edit_mode = 0

octave = 3

nb_keys = 16

const audio_context = new AudioContext()

//Sample list
const samples = [
    new Audio("assets/kick.wav"),
    new Audio("assets/snare.wav"),
    new Audio("assets/closed_hihat.wav"),
    new Audio("assets/open_hihat.wav"),
    new Audio("assets/shaker.wav"),
    new Audio("assets/fill.wav"),
]

//Step list for each sample
const sample_seqs = Array(samples.length).fill(Array(nb_keys).fill(false))

//Waiting for the HTML content to be loaded
document.addEventListener('DOMContentLoaded', function() {


    //Creation of the keys
    for(let i=0; i<nb_keys; i++){
        create_key(i)
    }

    //Keys click
    const keys = document.querySelectorAll(".key")
    keys.forEach((key, index) => {
        key.addEventListener('click', function() {


            //Play mode
            if (edit_mode == 0) {
                if(mode == 0){ //drum mode
                    play_sample(key, index)
                }else{ //synth mode
                    play_note(key, index, octave)
                }
            }

            //Edit mode
            else {
                //to be filled
            }
            
        })
    })

    //Mode drums/keyboard
    const mode_button = document.querySelector("#mode_button")
    mode_button.addEventListener('click', function() {
        switch_mode()
        mode = 1 - mode
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

    //Selector
    const selectors = document.querySelectorAll(".select-button-enabled")
    selectors.forEach((selector, index) => {
        selector.addEventListener('click', function (){

            //to be filled

        })
    })

});



//MODEL
counter = 0



//VIEW
switch_mode = function(){
    keys = document.querySelectorAll(".key")
    keys.forEach(key => key.classList.toggle("key-white"))
}

one_led_on = function(led, keep_on=false) {
    led.classList.toggle("led-on");
    if (!keep_on) {
        setTimeout(function() {
            led.classList.toggle("led-on");
        }, beat/4*1000)
    }
}

all_led_off = function() {
    leds = document.querySelectorAll(".led")
    leds.forEach(led => led.classList.remove("led-on"))
}

render = function() {
    leds = document.querySelectorAll(".led")
    all_led_off()
    leds[counter].classList.add("led-on")
}

create_key = function(index) {
    //Create key
    e = document.createElement("div")
    e.classList.add("key")
    k = document.createElement("div")
    k.classList.add("led")
    e.appendChild(k)
    document.querySelector(".keyboard").appendChild(e)

    //Create selector
    e = document.createElement("div")
    e.classList.add("select-button")
    if (index < samples.length) {
        e.classList.add("select-button-enabled")
    }
    document.querySelector(".selectors").appendChild(e)
}



//CONTROLLER
intervalId = 0

incr = function () {
    render()
    counter = (counter+1) % nb_keys
}

play_seq = function () {
    intervalId = setInterval(incr, beat/4*1000)
}

stop_seq = function () {
    clearInterval(intervalId)
    all_led_off()
    counter = 0
}



//MIX
play_note = function(key, key_index, octave) {
    one_led_on(key.children[0])
    osc = audio_context.createOscillator()
    osc.connect(audio_context.destination)
    osc.frequency.setValueAtTime((32.70*2**(key_index/12+octave)), audio_context.currentTime)

    osc.start()
    setTimeout(function() {osc.stop()}, 200)
}


play_sample = function(key, sample_index){
    if(sample_index < samples.length){
        one_led_on(key.children[0])
        samples[sample_index].play()
    }
}