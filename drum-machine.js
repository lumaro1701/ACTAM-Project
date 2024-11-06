/*
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqPCjw_17nBvDojf_PDj6C0uOqwULqgFo",
  authDomain: "actam-2024.firebaseapp.com",
  projectId: "actam-2024",
  storageBucket: "actam-2024.firebasestorage.app",
  messagingSenderId: "620541054373",
  appId: "1:620541054373:web:f0a24d99dd57af3f526c4c"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
db = firebase.firestore();
*/

console.log("This is my drum machine");

bpm = 174
beat = 60/bpm

mode = 0
play = 0
edit_mode = -1

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
sample_seqs = Array(nb_keys)
for(let i=0; i<sample_seqs.length; i++){
    sample_seqs[i] = Array(nb_keys)
    for(let j=0; j<nb_keys; j++){
        sample_seqs[i][j] = 0
    }
}

/*
db.collection("store").doc("data").set({nb_keys: nb_keys})
*/


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

    //Selector and edit mode
    const selectors = document.querySelectorAll(".select-button")
    selectors.forEach((selector, index) => {
        selector.addEventListener('click', function (){
            toggle_edit_mode(index)
        })
    })

});



//MODEL
counter = 0



//VIEW
switch_mode = function(){
    keys = document.querySelectorAll(".key")
    keys.forEach(key => key.classList.toggle("key-white"))
    toggle_edit_mode(-1)
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

render_leds_edit = function(edit_sample_index) {
    all_led_off()
    steps_on = sample_seqs[edit_sample_index]
    keys = document.querySelectorAll(".key")
    keys.forEach((key, index) => {
        if (steps_on[index] == 1){
            one_led_on(key.children[0], true)
        }
    })
}

disable_all_select_buttons = function () {
    document.querySelectorAll(".select-button").forEach(button => button.style.backgroundColor = "")
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
    document.querySelector(".selectors").appendChild(e)
}



//CONTROLLER
intervalId = 0

incr = function () {
    render()
    counter = (counter+1) % nb_keys
    for(let i=0; i<sample_seqs.length; i++){
        if (sample_seqs[i][counter] == 1){
            play_sample(i)
        }
    }
}

play_seq = function () {
    intervalId = setInterval(incr, beat/4*1000)
    toggle_edit_mode(-1)
}

stop_seq = function () {
    clearInterval(intervalId)
    all_led_off()
    counter = 0
}

edit_sample_seq = function(key_index, sample_index) {
    sample_seqs[sample_index][key_index] = 1 - sample_seqs[sample_index][key_index]
    render_leds_edit(sample_index)
}

toggle_edit_mode = function(index) {
    disable_all_select_buttons()
    if(edit_mode == index || index == -1){
        edit_mode = -1
        all_led_off()
    }else{
        edit_mode = index
        render_leds_edit(edit_mode)
        document.querySelectorAll(".select-button")[index].style.backgroundColor = "#ff0000"
    }
}


key_clicked = function(key, key_index) {
    one_led_on(key.children[0])
    if(mode == 0){
        play_sample(key_index)
    }else{
        play_note(key, key_index)
    }
}

//MIX
play_note = function(key, key_index) {
    osc = audio_context.createOscillator()
    osc.connect(audio_context.destination)
    osc.frequency.setValueAtTime((32.70*2**(key_index/12+octave)), audio_context.currentTime)

    osc.start()
    setTimeout(function() {osc.stop()}, 200)
}


play_sample = function(sample_index){
    if(sample_index < samples.length){
        samples[sample_index].play()
    }
}