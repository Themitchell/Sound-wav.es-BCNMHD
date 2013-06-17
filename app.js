
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


if (('production' || 'staging') == app.get('env')) {
    console.log("Initialising Redis To Go")
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    var client = redis.createClient(rtg.port, rtg.hostname);
    redis.auth(rtg.auth.split(":")[1]);

    io.configure(function () {
        io.set("transports", ["xhr-polling"]);
        io.set("polling duration", 10);
    });
} else {
    console.log("Initialising Redis")
    var client = redis.createClient();
}

client.on("error", function (err) {
    console.log("Error " + err);
});


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
