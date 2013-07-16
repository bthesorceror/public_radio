var net              = require('net'),
    util             = require('util'),
    ClientConnection = require('./lib/client_connection'),
    EventEmitter     = require('events').EventEmitter;

function proxy(func, context) {
  return function() {
    func.apply(context, arguments);
  }
}

function PublicRadio(port) {
  this.server  = this.createServer();
  this.port    = port;
  this.connections = [];
}

util.inherits(PublicRadio, EventEmitter);

PublicRadio.prototype.createServer = function() {
  return net.createServer(proxy(this.handler, this));
}

PublicRadio.prototype.handler = function(socket) {
  var self = this;
  var connection = new ClientConnection(socket);
  this.emit('connection', connection);

  var disconnect = proxy(function() {
    this.emit('disconnect', socket);
    this.removeConnection(connection);
  }, this)

  var error = proxy(function(err) {
    this.emit('error', err);
    disconnect();
  }, this)

  this.connections.push(connection);

  connection.events.on('incoming', function() {
    self._broadcast(arguments, connection);
  });

  socket.on('close', disconnect)
  socket.on('end', disconnect)
  socket.on('error', error);
}

PublicRadio.prototype._broadcast = function(args, exclude) {
  this.connections.forEach(function(conn) {
    if (conn != exclude) {
      conn.emit.apply(conn, args);
    }
  });
}

PublicRadio.prototype.broadcast = function() {
  this._broadcast(arguments);
}

PublicRadio.prototype.listen = function() {
  this.server.listen(this.port);
}

PublicRadio.prototype.addConnection = function(connection) {
  this.connections.push(connection);
}

PublicRadio.prototype.removeConnection = function(connection) {
  var index = this.connections.indexOf(connection);
  if (index >= 0) {
    this.connections.splice(index);
  }
}

PublicRadio.prototype.linkTo = function(host, port) {
  var client = new PublicRadioClient(host, port);
  var self = this;

  client.on('connected', function(connection) {
    connection.events.on('incoming', function() {
      self._broadcast(arguments, connection);
    });

    self.addConnection(connection);

    client.on('disconnected', function(conn) {
      self.removeConnection(connection);
    });
  });

  client.connect();
}

exports.PublicRadio = PublicRadio;

function PublicRadioClient(host, port) {
  this.host = host;
  this.port = port;
}

util.inherits(PublicRadioClient, EventEmitter);

PublicRadioClient.prototype.disconnected = function() {
  this.emit('disconnected', this.connection);
}

PublicRadioClient.prototype.error = function(err) {
  this.emit('error', err);
  this.disconnected();
}

PublicRadioClient.prototype._handler = function() {
  this.connection = new ClientConnection(this.client);
  this.emit('connected', this.connection);
}

PublicRadioClient.prototype.connect = function() {
  this.client = net.createConnection({port: this.port, host: this.host}, proxy(this._handler, this));
  this.client.on('end', proxy(this.disconnected, this));
  this.client.on('close', proxy(this.disconnected, this));
  this.client.on('error', proxy(this.error, this));
}

exports.PublicRadioClient = PublicRadioClient;
