c = new AudioContext();

document.addEventListener('DOMContentLoaded', function() {
    const attack = document.getElementById("attack-slider");
    const release = document.getElementById("release-slider");
    const delay = document.getElementById("delay-slider");

    const play = document.getElementById("play-button");
    const stop = document.getElementById("stop-button");
    const kick = document.getElementById("kick-button");

    play.addEventListener('click', function() {
        playSound(attack, release, delay);
    })

    stop.addEventListener('click', function() {
        c.suspend();
    })

    kick.addEventListener('click', function() {
        playKick();
    })


})



lfo = c.createOscillator();
lfo.frequency.value = 0;
lfo.start();

d = c.createDelay()
d.delayTime.value = 1;
d.connect(c.destination)
dg = c.createGain();
d.connect(dg)
dg.gain.value = 0.5;
dg.connect(d)


function playSound(attack, release, delay) {
    c.resume();
    o = c.createOscillator();

    g = c.createGain(); //create a gain block
    lfog = c.createGain();
    o.connect(g); //connect the osc to the gain block
    g.connect(d); //connect the gain block to the loudspaeakers
    lfog.connect(d);
    lfo.connect(lfog.gain);

    d.delayTime.value = parseFloat(delay.value)

    o.start();
    
    attack_time = parseFloat(attack.value)
    release_time = parseFloat(release.value)

    //gain to 0
    g.gain.setValueAtTime(0, c.currentTime);
    //gain ramp up to 1 in 0.5s
    g.gain.linearRampToValueAtTime(1, c.currentTime+attack_time)
    //after ramping up, ramp down to 0 in 0.5s
    g.gain.linearRampToValueAtTime(0, c.currentTime+attack_time+release_time) //can be exponentialRampToValueAtTime

    /*
    for (let i=0; i<=4; i++) {
        //gain to 0
        g.gain.setValueAtTime(0, i+c.currentTime);
        //gain ramp up to 1 in 0.5s
        g.gain.linearRampToValueAtTime(Math.exp(-1.5*i), i+c.currentTime+attack_time)
        //after ramping up, ramp down to 0 in 0.5s
        g.gain.linearRampToValueAtTime(0, i+c.currentTime+attack_time+release_time) //can be exponentialRampToValueAtTime

    }*/


    setTimeout(function() {g.gain.value = 0}, 1000);

}



function playKick() {

    c.resume();
    o = c.createOscillator();
    g = c.createGain()

    o.connect(g)
    g.connect(c.destination)

    o.start();

    //Frequency starts at 20000Hz
    o.frequency.setValueAtTime(20000, c.currentTime)
    g.gain.setValueAtTime(1, c.currentTime)
    //frequency ramp down exponentially
    o.frequency.exponentialRampToValueAtTime(40, c.currentTime+0.03)
    //gain decreases after 0.3s
    g.gain.linearRampToValueAtTime(0, c.currentTime+0.3)


}