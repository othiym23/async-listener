'use strict';

// This uses a large chunk of the tests Trevor Norris wrote for his
// implementation of addAsyncListener, so:
//
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

var test = require('tap').test;

test("async listener polyfill", function (t) {
  t.plan(3);

  if (process.addAsyncListener) {
    t.fail("this package is meant nodes without core support for async listeners");
    return t.end();
  }

  require('../index.js');

  t.ok(process.addAsyncListener, "addAsyncListener is available");

  var EventEmitter   = require('events').EventEmitter
    , fs             = require('fs')
    , addListener    = process.addAsyncListener
    , removeListener = process.removeAsyncListener
    , async          = 0
    , expectAsync    = 0
    , testQueue      = []
    ;

  // Called at the end of every test
  function testComplete() {
    process.nextTick(function() {
      if (testQueue.length > 0) {
        testQueue.shift()();
      }
      else {
        t.equal(async, expectAsync,  "captured all expected async callbacks");
        t.equal(testQueue.length, 0, "all tests have been processed");
      }
    });
  }
  // Allow all tests to queue before processing
  process.nextTick(testComplete);


  // --- Begin Testing --- //
  function onAsync() { async++; }
  function onAsync2() { async++; }


  // Catch that an async callback was queued
  testQueue.push(function() {
    addListener(onAsync);

    setTimeout(function() {
      testComplete();
    });
    expectAsync++;

    removeListener(onAsync);
  });


  // Async listeners should propagate with nested callbacks
  testQueue.push(function() {
    addListener(onAsync);

    process.nextTick(function() {
      setTimeout(function() {
        setImmediate(function() {
          var i = setInterval(function() {
            clearInterval(i);
            testComplete();
          });
          expectAsync++;
        });
        expectAsync++;
      });
      expectAsync++;
    });
    expectAsync++;

    removeListener(onAsync);
  });


  // Test removing the async listener in the middle of nested callbacks
  testQueue.push(function() {
    addListener(onAsync);

    setTimeout(function() {
      removeListener(onAsync);
      setImmediate(testComplete);
    });
    expectAsync++;
  });


  // Test callbacks from fs I/O
  testQueue.push(function() {
    var cntr = 2;
    addListener(onAsync);

    fs.stat('something random', function() {
      if (--cntr < 1) testComplete();
    });
    expectAsync++;

    setImmediate(function() {
      fs.stat('random again', function() {
        if (--cntr < 1) testComplete();
      });
      expectAsync++;
    });
    expectAsync++;

    removeListener(onAsync);
  });


  // Capture any callback passed to the event emitter
  testQueue.push(function() {
    var someEvent = new EventEmitter();
    addListener(onAsync);

    someEvent.on('stuff', function() { });
    expectAsync++;

    setImmediate(function() {
      someEvent.on('morestuff', function() { });
      expectAsync++;
      testComplete();
    });
    expectAsync++;

    removeListener(onAsync);
  });


  // Test triggers with two async listeners
  testQueue.push(function() {
    addListener(onAsync);
    addListener(onAsync2);

    setTimeout(function() {
      process.nextTick(function() {
        setImmediate(testComplete);
        expectAsync += 2;
      });
      expectAsync += 2;
    });
    expectAsync += 2;

    removeListener(onAsync);
    removeListener(onAsync2);
  });


  // Test when one of two async listeners is removed in the
  // middle of an asynchronous call stack
  testQueue.push(function() {
    addListener(onAsync);
    addListener(onAsync2);

    setTimeout(function() {
      removeListener(onAsync2);
      setImmediate(function() {
        process.nextTick(testComplete);
        expectAsync++;
      });
      expectAsync++;
    });
    expectAsync += 2;

    removeListener(onAsync);
  });
});
