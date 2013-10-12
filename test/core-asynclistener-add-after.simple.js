// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var PORT = 12346;

if (!process.addAsyncListener) require('../index.js');

var assert = require('assert');
var net = require('net');
var iter = 2;
var cntr = 0;
var caught = 0;


process.on('exit', function() {
  process._rawDebug('cntr:', cntr);
  process._rawDebug('caught:', caught);
  assert.equal(caught, 12);
});


// --- Begin Testing --- //

var listener = process.createAsyncListener(function() { }, {
  before: function(ctx, dom) {
    cntr++;
  },
  error: function(dom, err) {
    if (err.message === 'bummer')
      caught++;
    // The error callback isn't allowed to throw, so rethrowing will
    // allow the error to bubble.
    else
      throw err;
    return true;
  }
});


// Test timers

setTimeout(function() {
  throw new Error('bummer');
}, 10).addAsyncListener(listener);

setTimeout(function() {
  throw new Error('bummer');
}, 10).addAsyncListener(listener);

var a = setInterval(function() {
  clearInterval(a);
  throw new Error('bummer');
}, 20).addAsyncListener(listener);

var b = setInterval(function() {
  clearInterval(b);
  throw new Error('bummer');
}, 20).addAsyncListener(listener);

setImmediate(function() {
  throw new Error('bummer');
}).addAsyncListener(listener);


// Test net

var server = net.createServer(function(conn) {
  conn._handle.addAsyncListener(listener);

  conn.on('data', function() {
    if (--iter === 0)
    server.close(function() {
      throw new Error('bummer');
    });
    throw new Error('bummer');
  });

  conn.end('bye');
  throw new Error('bummer');
});


server.listen(PORT, function() {
  // Test adding the async listener after server creation. Though it
  // won't catch errors that originate synchronously from this point.
  server._handle.addAsyncListener(listener);

  for (var i = 0; i < iter; i++) {
    connectClient();
  }
});


function connectClient() {
  var client = net.connect(PORT, function() {
    client._handle.addAsyncListener(listener);
  });

  client.on('data', function(chunk) {
    client.end('see ya');
    throw new Error('bummer');
  });
}

