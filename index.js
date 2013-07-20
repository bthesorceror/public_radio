var net          = require('net'),
    util         = require('util'),
    proxy        = require('./lib/helpers').proxy,
    Telephone    = require('telephone_duplexer'),
    EventEmitter = require('events').EventEmitter;

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
  var connection = new Telephone(socket);
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

  connection.events().on('incoming', proxy(function() {
    this._broadcast(arguments, connection);
  }, this));

  connection.events().on('close', disconnect)
  connection.events().on('end', disconnect)
  connection.events().on('error', error);
}

PublicRadio.prototype._broadcast = function(args, exclude) {
  this.connections.forEach(function(conn) {
    if (conn != exclude) {
      conn.emit.apply(conn, args);
    }
  });
  this.emit.apply(this, args);
}

PublicRadio.prototype.broadcast = function() {
  this._broadcast(arguments);
}

PublicRadio.prototype.listen = function() {
  this.server.listen(this.port);
  return this;
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

PublicRadio.prototype.handleIncoming = function(connection) {
  return proxy(function() {
    this._broadcast(arguments, connection);
  }, this);
}

PublicRadio.prototype.handleDisconnect = function(connection) {
  return proxy(function() {
    this.removeConnection(connection);
  }, this);
}

PublicRadio.prototype.handleLink = function(client) {
  return function(connection) {
    connection.events().on('incoming', this.handleIncoming(connection));
    this.addConnection(connection);
    client.on('disconnected', this.handleDisconnect(connection));
  }
}

PublicRadio.prototype.linkTo = function(host, port) {
  var client = new PublicRadioClient(host, port);
  client.on('connected', proxy(this.handleLink(client), this));
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
  this.connection = new Telephone(this.client);
  this.emit('connected', this.connection);
}

PublicRadioClient.prototype.connect = function() {
  this.client = net.createConnection({port: this.port, host: this.host}, proxy(this._handler, this));
  this.client.on('end', proxy(this.disconnected, this));
  this.client.on('close', proxy(this.disconnected, this));
  this.client.on('error', proxy(this.error, this));
  return this;
}

exports.PublicRadioClient = PublicRadioClient;
