var net          = require('net'),
    util         = require('util'),
    Guid         = require('guid'),
    Telephone    = require('telephone_duplexer'),
    EventEmitter = require('events').EventEmitter;

function proxy(func, context) {
  return function() {
    func.apply(context, arguments);
  }
}

function PublicRadio(port) {
  this.port   = port;
  this.server = this.createServer();
  this.setupEvents();
}

util.inherits(PublicRadio, EventEmitter);

PublicRadio.prototype.setupEvents = function() {
  this._events = new EventEmitter();
}

PublicRadio.prototype.events = function() {
  return this._events;
}

PublicRadio.prototype.createServer = function() {
  return net.createServer(proxy(this.handler, this));
}

PublicRadio.prototype.connections = function() {
  this._connections = this._connections || [];
  return this._connections;
}

PublicRadio.prototype.close = function() {
  this.connections().forEach(function(conn) {
    conn.close();
  });
  this.server.close();
}

PublicRadio.prototype.handler = function(socket) {
  function cont() {
    var connection = new Telephone(socket);
    this.emit('connection', connection);

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

    this.addConnection(connection);

    connection.events().on('incoming', proxy(function() {
      this._broadcast(arguments, connection);
    }, this));

    connection.events().on('close', disconnect)
    connection.events().on('end', disconnect)
    connection.events().on('error', error);
  }
  var self = this;
  socket.once('data', function(data) {
    socket.write(Guid.raw() + "\r\n");
    cont.call(self);
  });
}

PublicRadio.prototype._clientBroadcast = function(args, exclude) {
  this.connections().forEach(function(conn) {
    if (conn != exclude) {
      conn.emit.apply(conn, args);
    }
  });
}

PublicRadio.prototype._broadcast = function(args, exclude) {
  this._clientBroadcast(args, exclude);
  this.events().emit.apply(this.events(), args);
}

PublicRadio.prototype.broadcast = function() {
  this._clientBroadcast(arguments);
}

PublicRadio.prototype.listen = function() {
  this.server.listen(this.port);
  return this;
}

PublicRadio.prototype.addConnection = function(connection) {
  this.connections().push(connection);
}

PublicRadio.prototype.removeConnection = function(connection) {
  var index = this.connections().indexOf(connection);
  if (index >= 0) {
    this.connections().splice(index, 1);
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
  this.client.write('\r\n');
  this.client.once('data', proxy(function(data) {
    this.guid = data.toString().trim();
    this.connection = new Telephone(this.client);
    this.emit('connected', this.connection);
  }, this));
}

PublicRadioClient.prototype.close = function() {
  this.client.end();
}

PublicRadioClient.prototype.connect = function() {
  this.client = net.createConnection({port: this.port, host: this.host}, proxy(this._handler, this));
  this.client.on('end', proxy(this.disconnected, this));
  this.client.on('close', proxy(this.disconnected, this));
  this.client.on('error', proxy(this.error, this));
  return this;
}

exports.PublicRadioClient = PublicRadioClient;
