Public Radio
------------

[![Build
Status](https://travis-ci.org/bthesorceror/public_radio.png?branch=master)](https://travis-ci.org/bthesorceror/public_radio)

Usage
=====

Creating a server

```javascript
var Server = require('public_radio').PublicRadio;

var server = new Server(5000);

server.listen();
```

Creating a client

```javascript
var Client = require('public_radio').PublicRadioClient;

var client = new Client('localhost', 5000);

client.on('connected', function(conn) {
  // do something with connection
});

client.connect();
```


Bigger Picture
==============

![Topology](http://f.cl.ly/items/3K1X3J0Q1E0p0Z2z230K/public_radio.png)
