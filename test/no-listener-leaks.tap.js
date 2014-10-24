'use strict';

var test = require('tap').test;

test('listeners should not affect parallel async stacks', function (t) {
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

test('listeners should not affect pending async contexts', function (t) {
  t.plan(1);

  if (!process.addAsyncListener) require('../index.js');

  var count = 0

  process.nextTick(function() {
    process.nextTick(function() {
      t.equal(count, 0)
    })
  })

  process.addAsyncListener({
    create : function () { count++ }
  });

});
