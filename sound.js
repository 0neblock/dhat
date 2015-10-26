var player = require("play-sound")(opts = {});
player.play("ohyeah.mp3", function(err){
    if(err) console.log(err);
})