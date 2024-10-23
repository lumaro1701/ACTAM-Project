c = new AudioContext();

document.addEventListener('DOMContentLoaded', function() {
    const attack = document.getElementById("attack-slider");
    const release = document.getElementById("release-slider");

    const play = document.getElementById("play-button");
    const stop = document.getElementById("stop-button");

    play.addEventListener('click', function() {
        playSound(attack, release);
    })

    stop.addEventListener('clock', function() {
        c.suspend();
    })


})



lfo = c.createOscillator();
lfo.frequency.value = 10;
lfo.start();


function playSound(attack, release) {
    c.resume();
    o = c.createOscillator();

    g = c.createGain(); //create a gain block
    lfog = c.createGain();
    o.connect(g); //connect the osc to the gain block
    g.connect(lfog); //connect the gain block to the loudspaeakers
    lfog.connect(c.destination);
    lfo.connect(lfog.gain);

    o.start();
    
    attack_time = parseFloat(attack.value)
    release_time = parseFloat(release.value)

    //Create a triangle enveloppe
    //gain to 0
    g.gain.setValueAtTime(0, c.currentTime);
    //gain ramp up to 1 in 0.5s
    g.gain.linearRampToValueAtTime(1, c.currentTime+attack_time)
    //after ramping up, ramp down to 0 in 0.5s
    g.gain.linearRampToValueAtTime(0, c.currentTime+attack_time+release_time) //can be exponentialRampToValueAtTime




    setTimeout(function() {g.gain.value = 0}, 1000);

}

