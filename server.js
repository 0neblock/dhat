var WebSocketServer = require('websocket').server;
var User = require("./user");
var https = require("https");
var fs = require("fs");
var server = https.createServer({
    key: fs.readFileSync("./key.pem"),
    cert: fs.readFileSync("./csr.pem")
});
server.listen(7994, function() {
    console.log((new Date()) + ' Server is listening on port 7994');
});
var users = [];
var clients = [];


 
wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production 
    // applications, as it defeats all standard cross-origin protection 
    // facilities built into the protocol and the browser.  You should 
    // *always* verify the connection's origin and decide whether or not 
    // to accept it. 
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed. 
  return true;
}
 
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin 
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('dhat-v1', request.origin);
    
    console.log((new Date()) + ' Connection accepted.');
    
    connection.sendUTF(JSON.stringify({type: "auth"}));
    connection.on('message', function(message) {
        var jsonM = JSON.parse(message.utf8Data);
        if(jsonM.type == "auth"){
            var loggedIn = false;
            var usernameTaken = false;
            for(var i = 0; i < users.length; i++){
                if(users[i].username == jsonM.user.username){
                    if(users[i].password == jsonM.user.password){
                        loggedIn = true;
                    }
                    usernameTaken = true;
                }
            }
            if(!loggedIn){
                if(!usernameTaken){
                    // New User
                    var user = jsonM.user;
                    users.push(user);
                } else {
                    connection.sendUTF(JSON.stringify({type: "failedLogin"}));
                    return;
                }
            } 
            
            var user = jsonM.user;
            if(clients.indexOf(connection) <= -1){
                clients.push(connection);
            }
            
            connection.sendUTF(JSON.stringify({type: "loginAccept", user: user}));
            connection.user = user;
            console.log('User connected: ' + user.username);
            broadcast({type: "system", message: {body: user.username + " has Joined the Chatroom!"}});
            
        }
        if(jsonM.type == "message"){
            console.log(jsonM.from.username + ' sent message: ' + jsonM.message.body);
            broadcast({type: "message", message: jsonM.message, user: jsonM.from});
        }
        if(jsonM.type == "logout"){
            console.log(connection.user.username + " has left the Chatroom!");
            connection.user = null;
            connection.sendUTF(JSON.stringify({type: "auth"}));
        }
        
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        if(connection.user){
            console.log(connection.user.username + " has left the Chatroom!");
            broadcast({type: "system", message: {body: connection.user.username + " has left the Chatroom!"}});
        }
    });
});

function broadcast(message){
    for(var i = 0; i < clients.length; i++){
        clients[i].sendUTF(JSON.stringify(message));
    }
}