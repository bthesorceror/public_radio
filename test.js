var tape   = require('tape'),
    Server = require('./index').PublicRadio,
    Client = require('./index').PublicRadioClient;

function createTimeout() {
  var timeout = setTimeout(function() { process.exit(1); }, 5000);
  return {
    clear: function() {
      clearTimeout(timeout);
    }
  }
}

function createDone(servers) {
  var timeout = createTimeout();
  return function() {
    timeout.clear();
    servers.forEach(function(server) {
      server.close();
    });
  }
}

tape('The whole tamale', function(t) {
  t.plan(7);

  var server2 = (new Server(5002)).listen();
  var server1 = (new Server(5001)).listen();
  var client1 = new Client('localhost', 5002).connect();
  var client2 = new Client('localhost', 5002).connect();
  var client3 = new Client('localhost', 5001).connect();

  var finished = createDone([server1, server2]);

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
      var connections = server1.connections();
      t.equal(msg, 'hello', 'client3 received event');
      t.equal(connections.length, 2, 'server1 currently has 2 connections');
      server1.on('disconnect', function(conn) {
        var connections = server1.connections();
        t.equal(connections.length, 1, 'server1 currently has 1 connections');
      });
      client3.close();
    });
  });


  setTimeout(function() {
    server2.events.on('server1', function(msg) {
      t.equal(msg, 'hello', 'server 2 receives event');
      server2.broadcast('server2', msg);
    });

    server1.events.on('server2', function(msg) {
      t.equal(msg, 'hello', 'server 1 receives event');
      server2.broadcast('client2', msg);
    });

    server1.broadcast('server1', 'hello');
  }, 1000);

  t.on('end', function() {
    finished();
  });
});

