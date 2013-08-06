![Topology](http://f.cl.ly/items/44350z3u2U0s2g2S3I0M/public_radio_header.png)

Build highly distributed services by allowing your node applications to share emitted events over tcp socket
connections.

How it works and what its for
=============================

Applications can act as a server (allowing for incoming connections) or a
client (connecting to a server). When a connection is made the stream is then
converted to an event emitter using @substack's emit-stream. The advantage of
Public Radio is that it allows you to create a graph of nodes made up of
server and clients that can emit events that will be received by all the other
nodes, as well as allowing them to bind callbacks to specific events they are
interested in.

[![Build
Status](https://travis-ci.org/bthesorceror/public_radio.png?branch=master)](https://travis-ci.org/bthesorceror/public_radio)

Usage
=====

**Creating a server that will listen for incoming connections**

```javascript
var Server = require('public_radio').Server;

var server = new Server(5000);

server.listen();
```

**Creating a client to connect to a server**

```javascript
var Client = require('public_radio').Client;

var client = new Client('localhost', 5000);

client.on('connected', function(conn) {
  // do something with connection
});

client.connect();
```

**Connect servers to other servers to share your events with them and their
clients**

```javascript

server.linkTo('localhost', 5001);

```

**Setting up a listener for an event on a server**

```javascript

server.events.on('stock_update', function(symbol, price) {
  // work with stock update
});

```

**Emitting an event from a server**

```javascript

server.broadcast('stock_update', 'GOOG', 15.43);

```

**Setting up a listener for an event on a client**

```javascript

client.on('connected', function(conn) {
  conn.on('stock_update', function(symbol, price) {
    // work with stock update
  });
});

```

**Emitting an event from the client**

```javascript

client.on('connected', function(conn) {

  conn.emit('stock_update', 'GOOG', 15.43);

});

```

or

```javascript

client.connection.emit('stock_update', 'GOOG', 15.43);

```

Callbacks
=========

The final argument of the emitted event can be a function

(replies have to be received within 60 seconds)

```javascript

client.on('connected', function(conn) {

  conn.emit('stock_update', 'GOOG', 15.43, function(alert) {
    // do something with alert
  });

});

```

The listener can reply to the emitting node via a function pass as the final argument

```javascript

server.events.on('stock_update', function(symbol, price, reply) {
  reply('SELL SELL SELL!');
});

```

So in this case the function passed to emit will be called with 'SELL SELL SELL!'

Bigger Picture
==============

![Topology](http://f.cl.ly/items/3K1X3J0Q1E0p0Z2z230K/public_radio.png)

**Setting up this network**

```javascript

var Server = require('public_radio').Server,
    Client = require('public_radio').Client;

var server1 = (new Server(5000)).listen(),
    server2 = (new Server(5001)).listen();

server1.linkTo('localhost', 5001);

var client1 = (new Client('localhost', 5000)),
    client2 = (new Client('localhost', 5000)),
    client3 = (new Client('localhost', 5001));

client1.on('connected', function(conn) {

});

client1.connect();

client2.on('connected', function(conn) {

});

client2.connect();

client3.on('connected', function(conn) {

});

client3.connect();

```
