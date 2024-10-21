console.log("This is my drum machine");

bpm = 120
beat = 60/bpm

mode = 0
play = 0
octave = 3

document.addEventListener('DOMContentLoaded', function() {


    const audio_context = new AudioContext()

    const samples = [
        new Audio("assets/kick.wav"),
        new Audio("assets/snare.wav"),
        new Audio("assets/closed_hihat.wav"),
        new Audio("assets/open_hihat.wav"),
        new Audio("assets/shaker.wav"),
        new Audio("assets/fill.wav"),
    ]

    //keys click
    const keys = document.querySelectorAll(".key")
    
    keys.forEach((key, index) => {
        key.addEventListener('click', function() {

            if(mode == 0){
                play_sample(key, samples[index])
            }else{
                play_note(key, audio_context, index, octave)
            }
            
        })
    })


    const mode_button = document.querySelector("#mode_button")
    mode_button.addEventListener('click', function() {
        switch_mode()
        mode = (mode+1) % 2
    })


    const play_button = document.querySelector("#play_button")
    play_button.addEventListener('click', function() {

        if(play == 0){
            play_seq()
        }else{
            stop_seq()
        }
        play = (play+1) % 2
    })



});



play_note = function(key, audio_context, key_index, octave) {
    one_led_on(key.children[0])
    osc = audio_context.createOscillator()
    osc.connect(audio_context.destination)
    osc.frequency.setValueAtTime((32.70*2**(key_index/12+octave)), audio_context.currentTime)

    osc.start()
    setTimeout(function() {osc.stop()}, 200)
}


play_sample = function(key, sample){
    one_led_on(key.children[0])
    sample.play()
}


//MODEL
counter = 0

//VIEW

switch_mode = function(){
    keys = document.querySelectorAll(".key")
    keys.forEach(key => key.classList.toggle("key-white"))
}

one_led_on = function(led) {
    led.classList.toggle("led-on");
    setTimeout(function() {
        led.classList.toggle("led-on");
    }, beat/4*1000)
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


//CONTROLLER

intervalId = 0

incr = function () {
    render()
    counter = (counter+1) % 16
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