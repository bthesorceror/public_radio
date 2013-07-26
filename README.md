![Topology](http://f.cl.ly/items/44350z3u2U0s2g2S3I0M/public_radio_header.png)

Creating distributed applications with networked nodes through events.

[![Build
Status](https://travis-ci.org/bthesorceror/public_radio.png?branch=master)](https://travis-ci.org/bthesorceror/public_radio)

Usage
=====

**Creating a server**

```javascript
var Server = require('public_radio').PublicRadio;

var server = new Server(5000);

server.listen();
```

**Creating a client**

```javascript
var Client = require('public_radio').PublicRadioClient;

var client = new Client('localhost', 5000);

client.on('connected', function(conn) {
  // do something with connection
});

client.connect();
```

**Server linking to another server**

```javascript

server.linkTo('localhost', 5001);

```

**Server listening for an event**

```javascript

server.events().on('stock_update', function(symbol, price) {
  // work with stock update
});

```

**Server broadcasting an event**

```javascript

server.broadcast('stock_update', 'GOOG', 15.43);

```

**Client listening for an event**

```javascript

client.on('connected', function(conn) {
  conn.on('stock_update', function(symbol, price) {
    // work with stock update
  });
});

```

**Client emits event**

```javascript

client.on('connected', function(conn) {

  conn.emit('stock_update', 'GOOG', 15.43);

});

```

or

```javascript

client.connection.emit('stock_update', 'GOOG', 15.43);

```

Bigger Picture
==============

![Topology](http://f.cl.ly/items/3K1X3J0Q1E0p0Z2z230K/public_radio.png)

**Setting up this network**

```javascript

var Server = require('public_radio').PublicRadio,
    Client = require('public_radio').PublicRadioClient;

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

**Any node can communicate with any other node**
