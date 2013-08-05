var ServerStream = function(connections) {
  this.connections = connections;
};

require('util').inherits(ServerStream, require('events').EventEmitter);

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

module.exports = ServerStream;
