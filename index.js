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

var ServerStream = function(connections) {
  this.connections = connections;
};

require('util').inherits(ServerStream, EventEmitter);

ServerStream.prototype.write = function () {
  var args = Array.prototype.slice.call(arguments, 0);
  this.connections.forEach(function(conn) {
    conn.write.apply(conn, args);
  });
};

ServerStream.prototype.end = function (data) {
  var args = Array.prototype.slice.call(arguments, 0);
  this.connections.forEach(function(conn) {
    conn.end.apply(conn, args);
  });
};


function PublicRadio(port) {
  this.port   = port;
  this.server = this.createServer();
  this.stream = new ServerStream(this.connections());
  this.setupEvents();
}

util.inherits(PublicRadio, EventEmitter);

PublicRadio.prototype.setupEvents = function() {
  this._events = new Telephone(this.stream);
}

PublicRadio.prototype.events = function() {
  return this._events;
}

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
  this.events().emit.apply(this._events, arguments);
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

// ------------------------------------ //

function PublicRadioClient(host, port) {
  this.host = host;
  this.port = port;
}

util.inherits(PublicRadioClient, EventEmitter);

PublicRadioClient.prototype.disconnected = function() {
  if (!this.disconnected) {
  this.emit('disconnected', this.connection);
    this.disconnected = true;
  }
}

PublicRadioClient.prototype.error = function(err) {
  this.emit('error', err);
  this.disconnected();
}

PublicRadioClient.prototype._handler = function() {
  this.disconnected = false;
  this.emit('connected', this.connection = new Telephone(this.client));
}

PublicRadioClient.prototype.close = function() {
  this.client.end();
}

PublicRadioClient.prototype.connect = function() {
  this.client = net.createConnection({port: this.port, host: this.host}, proxy(this._handler, this));
  this.client.on('end', proxy(this.disconnected, this));
  this.client.on('error', proxy(this.error, this));
  return this;
}

exports.PublicRadioClient = PublicRadioClient;
