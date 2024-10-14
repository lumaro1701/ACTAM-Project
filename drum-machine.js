console.log("This is my drum machine");

document.addEventListener('DOMContentLoaded', function() {

    const kick = new Audio("assets/kick.wav");

    const samples = [
        new Audio("assets/kick.wav"),
    ]


    const keys = document.querySelectorAll(".key")
    keys.forEach(key => {
        key.addEventListener('click', function() {
        key_click(key.children[0], kick);
        })
    })

});


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