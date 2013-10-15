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


if (!process.addAsyncListener) require('../index.js');

var assert  = require('assert');
var cluster = require('cluster');

if (cluster.isMaster) {
  
  cluster.setupMaster({
    silent : true
  });
  cluster.fork();
  cluster.on('exit', function(worker, code, signal) {
    
    // verify child exited because of throw from 'error'
    assert.equal(code, 2);
    
    console.log('ok');
  });
  
} else {
  
  var once = 0;

  function onAsync0() {}

  var handlers = {
    error: function () {
      
      // the error handler should not be called again
      if(once++ === 0) process.exit(2);
      
      throw new Error('error handler');
    }
  }

  var key = process.addAsyncListener(onAsync0, handlers);

  var fatal = process._fatalException;

  process.on('unhandledException', function () {
    
    // throwing in 'error' should bypass unhandledException
    process.exit(1);
  });
  
  setImmediate(function () {
    throw new Error('setImmediate');
  });

  process.removeAsyncListener(key);

};

