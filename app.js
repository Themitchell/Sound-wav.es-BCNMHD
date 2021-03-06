
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , socketio = require('socket.io')
  , redis = require("redis");

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

app.get('/', function (req, res) {
    routes.index(req, res, client);
});

server = http.createServer(app).listen(app.get('port'), function (){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = socketio.listen(server);

if (('production' || 'staging') == app.get('env')) {
    console.log("Initialising Redis To Go")
    var client = require("redis-url").connect(process.env.REDISTOGO_URL);

    io.configure(function () {
        io.set("transports", ["xhr-polling"]);
        io.set("polling duration", 10);
    });
} else {
    console.log("Initialising Redis")
    var client = redis.createClient();
    app.use(express.errorHandler());
}

client.on("error", function (err) {
    console.log("Error " + err);
});

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
