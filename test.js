var tape   = require('tape'),
    Server = require('./index').PublicRadio,
    Client = require('./index').PublicRadioClient;

var timeout = setTimeout(function() { process.exit(1); }, 5000);
var finished = function(t) {
  clearTimeout(timeout);
  t.end(); process.exit(0);
}

tape('The whole tamale', function(t) {
  var server2 = new Server(5002); server2.listen();
  var server1 = new Server(5001); server1.listen();
  var client1 = new Client('localhost', 5002).connect();
  var client2 = new Client('localhost', 5002).connect();
  var client3 = new Client('localhost', 5001).connect();

  server1.linkTo('localhost', 5002);

  client2.on('connected', function(conn) {
    conn.on('client2', function(msg) {
      t.equal(msg, 'hello', 'client2 received event');
      conn.emit('client1', msg);
    });
  });

  client1.on('connected', function(conn) {
    conn.on('client1', function(msg) {
      t.equal(msg, 'hello', 'client1 received event');
      conn.emit('client3', msg);
    });
  });

  client3.on('connected', function(conn) {
    conn.on('client3', function(msg) {
      t.equal(msg, 'hello', 'client3 received event');
      t.equal(server1.connections().length, 2, 'server1 currently has 2 connections');
      finished(t);
    });
  });

  t.plan(6);

  setTimeout(function() {
    server2.on('server1', function(msg) {
      t.equal(msg, 'hello', 'server 2 receives event');
      server2.broadcast('server2', msg);
    });

    server1.on('server2', function(msg) {
      t.equal(msg, 'hello', 'server 1 receives event');
      server2.broadcast('client2', msg);
    });

    server1.broadcast('server1', 'hello');
  }, 1000);
});

