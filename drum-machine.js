console.log("This is my drum machine");

document.addEventListener('DOMContentLoaded', function() {


    const c = new AudioContext()

    const kick = new Audio("assets/kick.wav");

    const samples = [
        new Audio("assets/kick.wav"),
    ]


    const keys = document.querySelectorAll(".key")
    keys.forEach(key => {
        key.addEventListener('click', function() {
            playNote(c, key.children[0])
            key_click(key.children[0], kick);
        })
    })

});


playNote = function(c, element) {
    if(element.classList.contains("led-off")){
        element.classList.remove("led-off");
        element.classList.add("led-on");
        o = c.createOscillator()
        o.connect(c.destination)
        o.start()
        setTimeout(function() {o.stop()}, 500)
    }
    else{
        element.classList.remove("led-on");
        element.classList.add("led-off");
    }
}


key_click = function(element, sample){
    if(element.classList.contains("led-off")){
        element.classList.remove("led-off");
        element.classList.add("led-on");
        state = sample.play();
    }
    else{
        element.classList.remove("led-on");
        element.classList.add("led-off");
        sample.pause();
    }
}