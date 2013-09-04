'use strict';

var test = require('tap').test;

test("async listener lifecycle", function (t) {
  t.plan(7);

  if (process.addAsyncListener) {
    t.fail("this package is meant nodes without core support for async listeners");
    return t.end();
  }

  require('../index.js');

  t.ok(process.addAsyncListener, "can add async listeners");

  var listener;
  t.doesNotThrow(function () {
    listener = process.addAsyncListener(
      function () {},
      {before : function () {}, after : function () {}}
    );
  }, "adding does not throw");

  t.ok(listener, "have a listener we can later remove");

  t.ok(process.removeAsyncListener, "can remove async listeners");

  t.doesNotThrow(function () {
    process.removeAsyncListener(listener);
  }, "removing does not throw");

  t.throws(function () {
    process.removeAsyncListener(listener);
  }, "removing the same listener twice throws");

  t.throws(function () {
    process.removeAsyncListener(null);
  }, "removing a nonexistent listener throws");
});
