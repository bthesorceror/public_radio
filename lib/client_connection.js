var emitstream   = require('emit-stream'),
    json         = require('JSONStream'),
    EventEmitter = require('events').EventEmitter;

function ClientConnection(socket) {
  var self = this;
  this.socket = socket;
  this.events = new EventEmitter();
  this.incoming = emitstream(socket.pipe(json.parse([true])));
  this.outgoing = new EventEmitter();
  emitstream(this.outgoing).pipe(json.stringify()).pipe(socket);
  var emit = this.incoming.emit;

  this.incoming.emit = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('incoming');
    self.events.emit.apply(self.events, args);
    emit.apply(self.incoming, arguments);
  }
}

ClientConnection.prototype.on = function() {
  this.incoming.on.apply(this.incoming, arguments);
}

ClientConnection.prototype.emit = function() {
  this.outgoing.emit.apply(this.outgoing, arguments);
}

module.exports = ClientConnection;
