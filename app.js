
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , socketio = require('socket.io');

var redis = require("redis");

if (this.env == ('production' || 'staging')) {
    var client = require("redis-url").connect(process.env.REDISTOGO_URL);
    io.configure(function () {
        io.set("transports", ["xhr-polling"]);
        io.set("polling duration", 10);
    });
} else {
    var client = redis.createClient();
}

client.on("error", function (err) {
    console.log("Error " + err);
});


var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function (req, res) {
    routes.index(req, res, client);
});

server = http.createServer(app).listen(app.get('port'), function (){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = socketio.listen(server);

io.sockets.on('connection', function (socket) {

    socket.on('setState', function (data) {
        client.hset('sequencer', data.id, data.state, redis.print);
        io.sockets.emit('updateState', data);
    });

    socket.on('setTempo', function (data) {
        client.hset('sequencer', 'tempo', data.tempo, redis.print);
        io.sockets.emit('updateTempo', data);
    });

});
