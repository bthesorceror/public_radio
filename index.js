var net          = require('net'),
    emitstream   = require('emit-stream'),
    util         = require('util'),
    json         = require('JSONStream'),
    EventEmitter = require('events').EventEmitter;

function proxy(func, context) {
  return function() {
    func.apply(context, arguments);
  }
}

function PublicRadio(port) {
  this.server  = this.createServer();
  this.port    = port;
  this.emitter = new EventEmitter();
}

util.inherits(PublicRadio, EventEmitter);

PublicRadio.prototype.createServer = function() {
  return net.createServer(proxy(this.handler, this));
}

PublicRadio.prototype.handler = function(socket) {
  var self = this;
  emitstream(this.emitter).pipe(json.stringify()).pipe(socket);
  this.emit('connection', socket);

  var disconnect = proxy(function() {
    this.emit('disconnect', socket);
  }, this)

  var error = proxy(function(err) {
    this.emit('error', err);
  }, this)

  socket.on('close', disconnect)
  socket.on('end', disconnect)
  socket.on('error', error);
}

PublicRadio.prototype.broadcast = function() {
  this.emitter.emit.apply(this.emitter, arguments);
}

PublicRadio.prototype.listen = function() {
  this.server.listen(this.port);
}

exports.PublicRadio = PublicRadio;

function PublicRadioClient(host, port) {
  this.host = host;
  this.port = port;
}

util.inherits(PublicRadioClient, EventEmitter);

PublicRadioClient.prototype._handler = function() {
  var emitter = emitstream(this.client.pipe(json.parse([true])));

  this.emit('connected', emitter);
}

PublicRadioClient.prototype.connect = function() {
  this.client = net.createConnection({port: this.port, host: this.host}, proxy(this._handler, this));
}

exports.PublicRadioClient = PublicRadioClient;
