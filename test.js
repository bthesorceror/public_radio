var tape   = require('tape'),
    Server = require('./index').PublicRadio,
    Client = require('./index').PublicRadioClient;

function coffeeBreak(func) {
  return setTimeout(func, 5);
}

var porter = {
  port: 5000,
  next: function() {
    this.port += 1;
    return this.current();
  },
  current: function() {
    return this.port;
  }
}

function createTimeout() {
  var timeout = setTimeout(function() { process.exit(1); }, 7000);
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

(function() {
  tape('server can communicate with client', function(t) {
    var server = (new Server(porter.next())).listen(),
        client = new Client('localhost', porter.current()).connect(),
        done = createDone([server]);

    t.plan(1);

    client.on('connected', function(conn) {
      coffeeBreak(function() {
        conn.on('message1', function(msg) {
          t.equal(msg, 'hello', 'client received msg from server');
        });

        server.broadcast('message1', 'hello');
      });
    });

    t.on('end', function() {
      done();
    });
  });

  tape('client can communicate with server', function(t) {
    var server = (new Server(porter.next())).listen(),
        client = new Client('localhost', porter.current()).connect(),
        done = createDone([server]);

    t.plan(1);

    client.on('connected', function(conn) {
      coffeeBreak(function() {
        server.events().on('message1', function(msg) {
          t.equal(msg, 'hello', 'server received msg from client');
        });

        conn.emit('message1', 'hello');
      });
    });

    t.on('end', function() {
      done();
    });
  });

  tape('client can communicate with server', function(t) {
    var server = (new Server(porter.next())).listen(),
        client1 = new Client('localhost', porter.current()).connect(),
        client2 = new Client('localhost', porter.current()).connect(),
        done = createDone([server]);

    t.plan(1);

    client2.on('connected', function(conn) {
      coffeeBreak(function() {
        conn.on('message1', function(msg) {
          t.equal(msg, 'hello', 'client2 received msg from client1');
        });

        client1.connection.emit('message1', 'hello');
      });
    });

    t.on('end', function() {
      done();
    });
  });
})();

(function() {
  tape('servers can communicate with each other', function(t) {
    var server1 = (new Server(porter.next())).listen(),
        server2 = (new Server(porter.next())).listen(),
        done    = createDone([server1, server2]);
    server1.linkTo('localhost', porter.current());

    t.plan(2);

    coffeeBreak(function() {

      server1.events().on('message1', function(msg) {
        t.equal(msg, 'hello', 'server2 two can send a message to server1');
      });

      server2.events().on('message2', function(msg) {
        t.equal(msg, 'hello', 'server1 two can send a message to server2');
      });

      server2.broadcast('message1', 'hello');
      server1.broadcast('message2', 'hello');

    });

    t.on('end', function() {
      done();
    });
  });

  tape('client can communicate with linked server', function(t) {
    var server1 = (new Server(porter.next())).listen(),
        server2 = (new Server(porter.next())).listen(),
        client  = (new Client('localhost', porter.current())).connect(),
        done    = createDone([server1, server2]);

    server1.linkTo('localhost', porter.current());

    t.plan(2);

    client.on('connected', function(conn) {
      conn.on('message2', function(msg) {
        t.equal(msg, 'hello', 'server1 two can send a message to client');
      });
    });

    coffeeBreak(function() {

      server1.events().on('message1', function(msg) {
        t.equal(msg, 'hello', 'server2 two can send a message to server1');
      });


      client.connection.emit('message1', 'hello');
      server1.broadcast('message2', 'hello');

    });

    t.on('end', function() {
      done();
    });
  });

  tape('clients can communicate through linked server', function(t) {
    var server1 = (new Server(porter.next())).listen(),
        client1 = (new Client('localhost', porter.current())).connect(),
        server2 = (new Server(porter.next())).listen(),
        client2 = (new Client('localhost', porter.current())).connect(),
        done    = createDone([server1, server2]);

    server1.linkTo('localhost', porter.current());

    t.plan(2);

    client1.on('connected', function(conn) {
      conn.on('message1', function(msg) {
        t.equal(msg, 'hello', 'client2 two can send a message to client1');
      });
    });

    client2.on('connected', function(conn) {
      conn.on('message2', function(msg) {
        t.equal(msg, 'hello', 'client1 two can send a message to client2');
      });
    });

    coffeeBreak(function() {

      client1.connection.emit('message2', 'hello');
      client2.connection.emit('message1', 'hello');

    });

    t.on('end', function() {
      done();
    });
  });
})();

(function() {
  tape('server does not broadcast to itself', function(t) {
    var server = (new Server(porter.next())).listen(),
        done = createDone([server]);

    t.plan(1);

    var not_called = true;

    server.events().on('message', function() {
      not_called = false;
    });

    server.broadcast('message');

    coffeeBreak(function() {
      t.ok(not_called, 'server did not receive its own event');
    });

    t.on('end', function() {
      done();
    });
  });
})();

(function() {

  tape('servers remove disconnected client', function(t) {
    var server = (new Server(porter.next())).listen(),
        client = new Client('localhost', porter.current()).connect(),
        done = createDone([server]);

    var server_connection;

    t.plan(3);

    server.on('connection', function(conn) {
      server_connection = conn;
    });

    server.on('disconnect', function(conn) {
      t.equal(conn, server_connection, 'correct connection removed');
      t.equal(server.connections().length, 0, 'server has 0 connections');
    });

    coffeeBreak(function() {
      t.equal(server.connections().length, 1, 'server has 1 connection');
      client.close();
    });

    t.on('end', function() {
      done();
    });
  });

  tape("servers remove disconnected client on 'end'", function(t) {
    var server = (new Server(porter.next())).listen(),
        client = new Client('localhost', porter.current()).connect(),
        done = createDone([server]);

    t.plan(3);

    coffeeBreak(function() {
      var connection = server.connections()[0];

      server.on('disconnect', function(conn) {
        t.equal(conn, connection, 'correct connection removed');
        t.equal(server.connections().length, 0, 'server has 0 connections');
      });

      t.equal(server.connections().length, 1, 'server has 1 connection');
      connection.emit('end');
    });

    t.on('end', function() {
      client.close();
      done();
    });
  });

  tape("servers remove disconnected client on 'close'", function(t) {
    var server = (new Server(porter.next())).listen(),
        client = new Client('localhost', porter.current()).connect(),
        done = createDone([server]);

    t.plan(3);

    coffeeBreak(function() {
      var connection = server.connections()[0];

      server.on('disconnect', function(conn) {
        t.equal(conn, connection, 'correct connection removed');
        t.equal(server.connections().length, 0, 'server has 0 connections');
      });

      t.equal(server.connections().length, 1, 'server has 1 connection');
      connection.emit('close');
    });

    t.on('end', function() {
      client.close();
      done();
    });
  });

  tape("servers remove disconnected client on 'error'", function(t) {
    var server = (new Server(porter.next())).listen(),
        client = new Client('localhost', porter.current()).connect(),
        done = createDone([server]);

    t.plan(4);

    server.on('error', function(err) {
      t.equal(err, 'blah');
    });

    coffeeBreak(function() {
      var connection = server.connections()[0];

      server.on('disconnect', function(conn) {
        t.equal(conn, connection, 'correct connection removed');
        t.equal(server.connections().length, 0, 'server has 0 connections');
      });

      t.equal(server.connections().length, 1, 'server has 1 connection');
      connection.emit('error', 'blah');
    });

    t.on('end', function() {
      client.close();
      done();
    });
  });
})();
