import express from 'express'
import routes from './routes/index.js'
import http from 'http'
import path from 'path'
import { Server as SocketioServer } from 'socket.io'
import redis from "redis"
import serveStatic from 'serve-static'
import bodyParser from 'body-parser'
import methodOverride from 'method-override'
import morgan from 'morgan'
import errorHandler from 'errorhandler'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(bodyParser());
app.use(methodOverride());
app.use(serveStatic(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    routes.index(req, res, redis_client);
});

const server = http.createServer(app)

var io = new SocketioServer(server);

if (('production' || 'staging') == app.get('env')) {
    io.configure(function () {
        io.set("transports", ["xhr-polling"]);
        io.set("polling duration", 10);
    });
} else {
    app.use(errorHandler());
}

console.log("Initialising Redis")
const redis_client = await redis
  .createClient({ url: 'redis://redis:6379' })
  .on("error", console.log)
  .connect()

io.on('connection', function (socketio_client) {
    socketio_client.on('setState', function (data) {
        redis_client.hSet('sequencer', data.id, data.state, redis.print);
        io.sockets.emit('updateState', data);
    });

    socketio_client.on('setTempo', function (data) {
        redis_client.hSet('sequencer', 'tempo', data.tempo, redis.print);
        io.sockets.emit('updateTempo', data);
    });
});

server.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
