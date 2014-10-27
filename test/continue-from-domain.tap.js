'use strict';

var domain = require('domain');
var test = require('tap').test;
if (!process.addAsyncListener) require('../index.js');

test('domin handlers have the correct listeners', function (t) {
  var create = 0;
  var before = 0;
  var after = 0;
  var error = 0;

  process.addAsyncListener({
    create: function() { create++ },
    before: function() { before++ },
    after: function() { after++ },
    error: function() { error++ }
  });

  t.plan(9);

  var d = domain.create();

  d.on('error', function(err) {
    t.equal(err.message, 'from domain');
    t.equal(create, 3);
    t.equal(before, 3);
    t.equal(after, 1);
    t.equal(error, 1);
    process.nextTick(function() {
      t.equal(create, 4);
      t.equal(before, 4);
      t.equal(after, 2);
      t.equal(error, 1);
    });
  });

  process.nextTick(d.bind(function() {
    process.nextTick(function() {
      throw new Error('from domain');
    });
  }));
});
