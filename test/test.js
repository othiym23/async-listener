var test = require('tap').test;

test("after handler not run on throw", function (t) {
  t.plan(2);
  
  if (!process.addAsyncListener) require('../index.js');

  function onAsync() {
    return {}
  }

  var longStack = {
    after: function asyncAfter(context, domain, returnValue) {
      t.fail();
    },
    error: function asyncError(domain, err) {
      t.ok(domain);
    }
  }
  
  key = process.addAsyncListener(onAsync, longStack);
  
  setImmediate(function () {
    throw active;
  });
  
  function handler(err) {
    process.removeAsyncListener(key);
    process.removeListener('uncaughtException', handler);
    t.ok(err);
  }
  
  process.on('uncaughtException', handler);
  
});
