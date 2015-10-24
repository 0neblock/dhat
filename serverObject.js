function Server(host, port){
    this.host = host;
    this.port = port;
    this.connection = null;
    this.ready = false;
    
    this.getURL = function(){
        return "ws://" + host + ":" + port + "/";
    }
    
    this.setConnection = function(connection){
        this.connection = connection;
    }
}

module.exports = Server;