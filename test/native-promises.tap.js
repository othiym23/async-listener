if (!global.Promise) return;

var test = require('tap').test;
require('../index.js');


test('then', function(t) {
  t.plan(4);

  var listener = addListner();

  var promise = new Promise(function(accept, reject) {
    listener.currentName = 'accept';
    accept(10);
  });

  promise.then(function(val) {
    listener.currentName = 'nextTick in first then';
    process.nextTick(function() {
      t.strictEqual(val, 10);
    });
  });

  listener.currentName = 'setImmediate in root';
  setImmediate(function() {
    promise.then(function(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);
      listener.currentName = 'setTimeout in 2nd then';
      setTimeout(function() {
        t.deepEqual(listener.root, expected);
        t.end();
      });
    });
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'accept',
        children: [
          {
            name: 'nextTick in first then',
            children: [],
            before: 1,
            after: 1,
            error: 0
          },
          {
            name: 'setTimeout in 2nd then',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }
        ],
        before: 2,
        after: 2,
        error: 0
      },
      {
        name: 'setImmediate in root',
        children: [],
        before: 1,
        after: 1,
        error: 0
      }
    ],
    before: 0,
    after: 0,
    error: 0
  }
});

test('chain', function chainTest(t) {
  t.plan(4);

  var listener = addListner();

  var promise = new Promise(function(accept, reject) {
    listener.currentName = 'accept';
    accept(10);
  });

  promise.chain(function(val) {
    listener.currentName = 'nextTick in first chain';
    process.nextTick(function() {
      t.strictEqual(val, 10);
    });
  });

  listener.currentName = 'setImmediate in root';
  setImmediate(function() {
    promise.chain(function(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);
      listener.currentName = 'setTimeout in 2nd chain';
      setTimeout(function() {
        t.deepEqual(listener.root, expected);
        t.end();
      });
    });
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'accept',
        children: [
          {
            name: 'nextTick in first chain',
            children: [],
            before: 1,
            after: 1,
            error: 0
          },
          {
            name: 'setTimeout in 2nd chain',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }
        ],
        before: 2,
        after: 2,
        error: 0
      },
      {
        name: 'setImmediate in root',
        children: [],
        before: 1,
        after: 1,
        error: 0
      }
    ],
    before: 0,
    after: 0,
    error: 0
  }
});

test('catch', function(t) {
  t.plan(4)
  var listener = addListner();

  var promise = new Promise(function(accept, reject) {
    listener.currentName = 'reject';
    reject(15);
  });

  promise.catch(function(val) {
    listener.currentName = 'nextTick in catch';
    process.nextTick(function() {
      t.strictEqual(val, 15);
    });
  });

  listener.currentName = 'setImmediate in root';
  setImmediate(function() {
    promise.then(
      function fullfilled() {
        throw new Error('should not be called on reject');
      },
      function rejected(val) {
        t.strictEqual(val, 15);
        t.strictEqual(this, global);
        listener.currentName = 'setTimeout in then';
        setTimeout(function() {
          t.deepEqual(listener.root, expected);
          t.end();
        });
      }
    )
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'reject',
        children: [
          {
            name: 'nextTick in catch',
            children: [],
            before: 1,
            after: 1,
            error: 0
          },
          {
            name: 'setTimeout in then',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }
        ],
        before: 2,
        after: 2,
        error: 0
      },
      {
        name: 'setImmediate in root',
        children: [],
        before: 1,
        after: 1,
        error: 0
      }
    ],
    before: 0,
    after: 0,
    error: 0
  };
});

test('Promise.resolve', function resolveTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve';
  var p = Promise.resolve(123);

  p.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      t.equal(value, 123)
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
            name: 'resolve',
          children: [{
            name: 'nextTick',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }],
        before: 0,
        after: 0,
        error: 0
      });
      t.end();
    });
    process.removeAsyncListener(listener.listener);
  });
});

test('Promise.accept', function acceptTest(t) {
  var listener = addListner();

  listener.currentName = 'accept';
  var p = Promise.accept(123);

  p.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      t.equal(value, 123)
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
            name: 'accept',
          children: [{
            name: 'nextTick',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }],
        before: 0,
        after: 0,
        error: 0
      });
      t.end();
    });
    process.removeAsyncListener(listener.listener);
  });
});

test('Promise.reject', function rejectTest(t) {
  var listener = addListner();

  listener.currentName = 'reject';
  var p = Promise.reject(123);

  p.catch(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      t.equal(value, 123);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
            name: 'reject',
          children: [{
            name: 'nextTick',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }],
        before: 0,
        after: 0,
        error: 0
      });
      t.end();
    });
    process.removeAsyncListener(listener.listener);
  });
});

test('Promise.all', function allTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve 1';
  var a = Promise.resolve(123);
  listener.currentName = 'resolve 2';
  var b = Promise.resolve(456);
  listener.currentName = 'all';
  var p = Promise.all([a, b])

  p.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.deepEqual(value, [123, 456])
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve 1',
          children: [],
          before: 1,
          after: 1,
          error: 0
        }, {
          name: 'resolve 2',
          children: [{
            name: 'all',
            children: [{
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            }],
            before: 1,
            after: 1,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }],
        before: 0,
        after: 0,
        error: 0
      })
      t.end();
    });
  });
});

test('Promise.all reject', function allTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve';
  var a = Promise.resolve(123);
  listener.currentName = 'reject';
  var b = Promise.reject(456);
  listener.currentName = 'all';
  var p = Promise.all([a, b])

  p.catch(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 456)
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve',
          children: [],
          before: 1,
          after: 1,
          error: 0
        }, {
          name: 'reject',
          children: [{
            name: 'all',
            children: [{
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            }],
            before: 1,
            after: 1,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }],
        before: 0,
        after: 0,
        error: 0
      })
      t.end();
    });
  });
});

test('Promise.race', function raceTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve 1';
  var a = Promise.resolve(123);
  listener.currentName = 'resolve 2';
  var b = Promise.resolve(456);
  listener.currentName = 'race';
  var p = Promise.race([a, b])

  p.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 123)
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve 1',
          children: [{
            name: 'race',
            children: [{
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            }],
            before: 1,
            after: 1,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }, {
          name: 'resolve 2',
          children: [],
          before: 1,
          after: 1,
          error: 0
        }],
        before: 0,
        after: 0,
        error: 0
      })
      t.end();
    });
  });
});

test('Promise.race - reject', function raceTest(t) {
  var listener = addListner();

  listener.currentName = 'reject';
  var a = Promise.reject(123);
  listener.currentName = 'resolve';
  var b = Promise.resolve(456);
  listener.currentName = 'race';
  var p = Promise.race([a, b])

  p.catch(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 123)
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'reject',
          children: [{
            name: 'race',
            children: [{
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            }],
            before: 1,
            after: 1,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }, {
          name: 'resolve',
          children: [],
          before: 1,
          after: 1,
          error: 0
        }],
        before: 0,
        after: 0,
        error: 0
      })
      t.end();
    });
  });
});

test('Promise.defer', function diferTest(t) {
  var listener = addListner();

  listener.currentName = 'defer';
  var p = Promise.defer()
  listener.currentName = 'resolve';
  p.resolve(123)
  listener.currentName = 'reject';
  p.reject(456)

  p.promise.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 123)
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve',
          children: [{
            name: 'nextTick',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }],
        before: 0,
        after: 0,
        error: 0
      })
      t.end();
    });
  });
});

function addListner() {
  var listener = process.addAsyncListener({
    create: create,
    before: before,
    after: after,
    error: error
  });


  var state = {
    listener: listener,
    currentName: 'root',
  };

  state.root = create();
  state.current = state.root;

  return state;

  function create () {
    var node = {
      name: state.currentName,
      children: [],
      before: 0,
      after: 0,
      error: 0
    };

    if(state.current) state.current.children.push(node);
    return node;
  }

  function before(ctx, node) {
    state.current = node;
    state.current.before++;
  }

  function after(ctx, node) {
    node.after++;
    state.current = null;
  }

  function error(ctx, node) {
    node.error++;
    state.current = null;
    return false;
  }
}
