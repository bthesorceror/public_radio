var net          = require('net');
var util         = require('util');
var Telephone    = require('telephone_duplexer');
var proxy        = require('./proxy');
var ServerStream = require('./server_stream');

function PublicRadio(port) {
  this.port   = port;
  this.server = this.createServer();
  this.stream = new ServerStream(this.connections());
  this.events = new Telephone(this.stream);
}
util.inherits(PublicRadio, require('events').EventEmitter);

PublicRadio.prototype.createServer = function() {
  return net.createServer(proxy(this.setupConnection, this));
}

PublicRadio.prototype.connections = function() {
  this._connections = this._connections || [];
  return this._connections;
}

PublicRadio.prototype.close = function() {
  this.connections().forEach(function(conn) {
    conn.end();
  });
  this.server.close();
}

PublicRadio.prototype.setupConnection = function(socket) {
  this.emit('connection', socket);
  this.addConnection(socket);
}

PublicRadio.prototype._clientBroadcast = function(data, exclude) {
  this.connections().forEach(function(conn) {
    if (conn !== exclude) {
      conn.write(data);
    }
  });
  this.stream.emit('data', data);
}

PublicRadio.prototype.broadcast = function() {
  this.events.emit.apply(this.events, arguments);
}

PublicRadio.prototype.listen = function() {
  this.server.listen(this.port);
  return this;
}

PublicRadio.prototype.createDataHandler = function(socket) {
  return proxy(function(data) {
    this._clientBroadcast(data, socket);
  }, this);
}

PublicRadio.prototype.createDisconnectHandler = function(socket) {
  disconnected = false;
  return proxy(function() {
    if (disconnected) return;
    this.removeConnection(socket);
    this.emit('disconnect', socket);
    disconnected = true;
  }, this)
}

PublicRadio.prototype.createErrorHandler = function(socket) {
  return proxy(function(err) {
    this.emit('error', err);
    this.removeConnection(socket);
  }, this)
}

PublicRadio.prototype.addConnection = function(socket) {
  this.connections().push(socket);
  var handleDisconnect = this.createDisconnectHandler(socket);

  socket.on('data', this.createDataHandler(socket));
  socket.on('end', handleDisconnect)
  socket.on('close', handleDisconnect)
  socket.on('error', this.createErrorHandler(socket));
}

PublicRadio.prototype.removeConnection = function(socket) {
  var index = this.connections().indexOf(socket);
  if (index >= 0) {
    this.connections().splice(index, 1);
  }
}

PublicRadio.prototype.linkTo = function(host, port) {
  var client = net.createConnection({port: port, host: host}, proxy(function() {
    this.addConnection(client);
  }, this));
}

module.exports = PublicRadio;
