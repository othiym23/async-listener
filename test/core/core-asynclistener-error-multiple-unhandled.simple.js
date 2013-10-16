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


if (!process.addAsyncListener) require('../../index.js');

var assert = require('assert');
var active = null;
var cntr = 0;

function onAsync0() {
  return 0;
}

function onAsync1() {
  return 1;
}

var results = [];
var asyncNoHandleError = {
  error: function (stor) {
    results.push(stor);
  }
}

var listeners = [
  process.addAsyncListener(onAsync0, asyncNoHandleError),
  process.addAsyncListener(onAsync1, asyncNoHandleError)
];
  
function expect2Errors() {
  
  // unhandled errors should propagate to all listeners
  assert.equal(results[0], 0);
  assert.equal(results[1], 1);
  assert.equal(results.length, 2);
  
  console.log('ok');
}

process.on('uncaughtException', expect2Errors);

setImmediate(function () {
  throw new Error();
});

