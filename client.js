var Telephone = require('telephone_duplexer');
var proxy     = require('./proxy');

function PublicRadioClient(host, port) {
  this.host = host;
  this.port = port;
}

(require('util')).inherits(PublicRadioClient, require('events').EventEmitter);

PublicRadioClient.prototype.disconnected = function() {
  if (!this.disconnected) {
    this.emit('disconnected', this.connection);
    this.disconnected = true;
  }
  this.client.destroy();
  this.connection.close();
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
  this.connection.close();
}

PublicRadioClient.prototype.connect = function() {
  this.client = (require('net')).createConnection({port: this.port, host: this.host}, proxy(this._handler, this));
  this.client.on('end', proxy(this.disconnected, this));
  this.client.on('close', proxy(this.disconnected, this));
  this.client.on('error', proxy(this.error, this));
  return this;
}

module.exports = PublicRadioClient;
