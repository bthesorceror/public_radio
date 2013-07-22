var tape   = require('tape'),
    Server = require('./index').PublicRadio,
    Client = require('./index').PublicRadioClient;

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

(function() {
  tape('server can communicate with client', function(t) {
    var server = (new Server(porter.next())).listen(),
        client = new Client('localhost', porter.current()).connect(),
        done = createDone([server]);

    t.plan(1);

    client.on('connected', function(conn) {
      setTimeout(function() {
        conn.on('message1', function(msg) {
          t.equal(msg, 'hello', 'client received msg from server');
        });

        server.broadcast('message1', 'hello');
      }, 100);
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
      setTimeout(function() {
        server.events.on('message1', function(msg) {
          t.equal(msg, 'hello', 'server received msg from client');
        });

        conn.emit('message1', 'hello');
      }, 100);
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
      setTimeout(function() {
        conn.on('message1', function(msg) {
          t.equal(msg, 'hello', 'client2 received msg from client1');
        });

        client1.connection.emit('message1', 'hello');
      }, 100);
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

    setTimeout(function() {

      server1.events.on('message1', function(msg) {
        t.equal(msg, 'hello', 'server2 two can send a message to server1');
      });

      server2.events.on('message2', function(msg) {
        t.equal(msg, 'hello', 'server1 two can send a message to server2');
      });

      server2.broadcast('message1', 'hello');
      server1.broadcast('message2', 'hello');

    }, 5);

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

    setTimeout(function() {

      server1.events.on('message1', function(msg) {
        t.equal(msg, 'hello', 'server2 two can send a message to server1');
      });


      client.connection.emit('message1', 'hello');
      server1.broadcast('message2', 'hello');

    }, 5);

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

    setTimeout(function() {

      client1.connection.emit('message2', 'hello');
      client2.connection.emit('message1', 'hello');

    }, 5);

    t.on('end', function() {
      done();
    });
  });
})();

(function() {

  tape('The whole tamale', function(t) {
    t.plan(7);
    var port1 = porter.next();
    var port2 = porter.next();

    var server2 = (new Server(port1)).listen();
    var server1 = (new Server(port2)).listen();

    var finished = createDone([server1, server2]);

    var part2 = function() {
      server1.linkTo('localhost', port1);

      var client1 = new Client('localhost', port1).connect();
      var client2 = new Client('localhost', port1).connect();
      var client3 = new Client('localhost', port2).connect();

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
    };

    setTimeout(part2, 1000);
    t.on('end', function() {
      finished();
    });
  });
})();
