'use strict';

var test = require('tap').test;

test("async listener lifecycle", function (t) {
  t.plan(1);

  if (!process.addAsyncListener) require('../index.js');

  var count = 0

  setTimeout(function() {
    process.addAsyncListener({
      create : function () { count++ }
    });
  }, 0);

  setTimeout(function() {
    process.nextTick(function() {
      t.equal(count, 0)
      t.end()
    })
  }, 15)
});
