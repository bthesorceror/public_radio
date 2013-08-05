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

PublicRadio.prototype.addConnection = function(connection) {
  this.connections().push(connection);

  var disconnected = false;
  var disconnect = proxy(function() {
    if (disconnected) return;
    this.removeConnection(connection);
    this.emit('disconnect', connection);
    disconnected = true;
  }, this)

  var error = proxy(function(err) {
    this.emit('error', err);
    disconnect();
  }, this)

  connection.on('data', proxy(function(data) {
    this._clientBroadcast(data, connection);
  }, this))

  connection.on('end', disconnect)
  connection.on('close', disconnect)
  connection.on('error', error);
}

PublicRadio.prototype.removeConnection = function(connection) {
  var index = this.connections().indexOf(connection);
  if (index >= 0) {
    this.connections().splice(index, 1);
  }
}

PublicRadio.prototype.linkTo = function(host, port) {
  var client = net.createConnection({port: port, host: host}, proxy(function() {
    this.addConnection(client);
  }, this));
}

exports.PublicRadio = PublicRadio;
