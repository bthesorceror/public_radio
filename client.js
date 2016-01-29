var Telephone = require('telephone_duplexer');

function PublicRadioClient(host, port) {
  this.host = host;
  this.port = port;
}

(require('util')).inherits(PublicRadioClient, require('events').EventEmitter);

PublicRadioClient.prototype.disconnect = function() {
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
  this.client = (require('net'))
    .createConnection({
      port: this.port,
      host: this.host
    }, this._handler.bind(this));
  this.client.on('end', this.disconnect.bind(this));
  this.client.on('close', this.disconnect.bind(this));
  this.client.on('error', this.error.bind(this));
  return this;
}

module.exports = PublicRadioClient;
