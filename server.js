var net          = require('net');
var util         = require('util');
var Telephone    = require('telephone_duplexer');
var RadioStatic  = require('radio_static');

function PublicRadio(port) {
  this.port   = port;
  this.server = this.createServer();
  this.stream = new RadioStatic();
  this.events = new Telephone(this.stream);
  this.events.on('error', function(err) {
   this.emit('error', err);
  }.bind(this));
}
util.inherits(PublicRadio, require('events').EventEmitter);

PublicRadio.prototype.createServer = function() {
  return net.createServer(this.setupConnection.bind(this));
}

PublicRadio.prototype.close = function() {
  this.stream.end();
  this.server.close();
}

PublicRadio.prototype.setupConnection = function(socket) {
  this.emit('connection', socket);
  this.addConnection(socket);
}

PublicRadio.prototype.broadcast = function() {
  this.events.emit.apply(this.events, arguments);
}

PublicRadio.prototype.listen = function() {
  this.server.listen(this.port);
  return this;
}

PublicRadio.prototype.addConnection = function(socket) {
  this.stream.assimilate(socket);
}

PublicRadio.prototype.linkTo = function(host, port) {
  var client = net.createConnection({port: port, host: host}, function() {
    this.addConnection(client);
  }.bind(this));
}

module.exports = PublicRadio;
