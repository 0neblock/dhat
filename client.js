var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();
var readline = require("readline");
var Server = require("./serverObject")
var colors = require("colors");
var player = require("play-sound")(opts = {});
const exec = require('child_process').exec;

var commandLineArgs = require("command-line-args");
 
var cli = [
    { name: "ip", alias: "h", type: String },
    { name: "port", alias: "p", type: String },
    { name: "username", alias: "u", type: String },
    { name: "password", type: String }
];

var options = commandLineArgs(cli);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var user = null;
var IP = "";
var server = null;
function getHostDetails(callback){
    if(!options.ip){
        rl.question("Please enter the IP to connect to: ", function(answer){
            if(!answer.match(/^([0-9]{1,3}\.){3}[0-9]{1,3}$/)){
                console.log("Incorrect IP".red);
                getHostDetails(callback);
                return;
            }
            IP = answer.trim();
            getPort(callback);
        });
    } else {
        IP = options.ip;
        getPort(callback);
    }
}

function getPort(callback){
    if(!options.port){
        rl.question("Please enter the PORT to connect to: ", function(answer){
            if(!answer.match(/^[0-9]{4}$/)){
                console.log("Incorrect Port".red);
                getPort(callback);
                return;
            }
            server = new Server(IP, answer.trim());
            callback(server);
        });
    } else {
        server = new Server(IP, options.port);
        callback(server);
    }
}

getHostDetails(function(server){
    console.log("Attempting Connection...");
    client.connect(server.getURL(), "dhat-v1");
});


client.on('connectFailed', function(error) {
    write('Connect Error: ' + error.toString());
});
 
client.on('connect', function(connection) {
    write('Connected Succesfully!');
    server.setConnection(connection);
    connection.on('error', function(error) {
        write("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        write('Lost connection to server');
    });
    connection.on('message', function(message){
        var jsonM = JSON.parse(message.utf8Data);
        switch(jsonM.type){
            case "auth":
                // We need to auth
                if(!options.username){
                    rl.question("Please enter Username to authenticate with: ", function(answer){
                          var username = answer;
                            rl.question("Enter Password: ", function(answer){
                                var password = answer;
                                console.log("Authenticating...");
                                server.connection.send(JSON.stringify({type: "auth", user: {username: username, password: password}}));
                            });
                    });
                } else {
                    // Delete saved username so we can logout in the same session
                    
                    console.log("Logging in as " + options.username);
                    if(!options.password){
                        rl.question("Enter Password: ", function(answer){
                            var password = answer;
                            console.log("Authenticating...");
                            server.connection.send(JSON.stringify({type: "auth", user: {username: options.username, password: password}}));
                            options.username = null;
                        });
                    } else {
                        
                        console.log("Authenticating...");
                        server.connection.send(JSON.stringify({type: "auth", user: {username: options.username, password: options.password}}));
                        options.password = null;
                        options.username = null;
                    }
                }
            break;
            case "failedLogin":
                console.log("Login Failed :()");
            break;
            case "message":
                // We have received a message
                if(jsonM.user.username == user.username){
                    write(colors.green(jsonM.user.username));
                } else {
                    write(colors.gray(jsonM.user.username));
//                    player.play("ohyeah.mp3", function(err){
//                        if(err) console.log(err);
//                    })
                    exec("say -v Fred '" + jsonM.message.body + "'");
                }
                
                write(jsonM.message.body);
                write("");
            break;
            case "loginAccept":
                // Our login has been accepted
                console.log("You have logged in as: " + jsonM.user.username);
                user = jsonM.user;
                server.ready = true;
                rl.on("line", function(data){
                    process.stdout.cursorTo(0);
                    process.stdout.moveCursor(0, -1);
                    process.stdout.clearLine();
                    if(data.trim() != ""){
                        processMessage(data.trim());
                    }
                })
            break;
            case "system":
                // Print out system messages
                console.log(colors.yellow(jsonM.message.body));
            break;
        }
    });
});


function write(d){
    console.log(d);
}


function processMessage(d){
    switch(d.charAt(0)){
        case '$':
            // System message, perform action
            switch(d){
                case '$logout':
                case '$logoff':
                    
                    server.connection.send(JSON.stringify({type: "logout"}));
                    console.log("Logged out.".yellow);
                break;
            }
        break;
        default:
            sendMessage(d);
        break;
    }
}

function sendMessage(d){
    if(server.ready){
        server.connection.send(JSON.stringify({type: "message", message: {body: d}, from: user}));
    }
}



