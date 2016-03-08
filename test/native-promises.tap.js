if (!global.Promise) return;

var test = require('tap').test;

var unwrappedPromise = global.Promise;
var resolvedBeforeWrap = unwrappedPromise.resolve(123)

require('../index.js');


test('then', function(t) {
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
    listener.currentName = 'first then continuation';
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
      listener.currentName = '2nd then continuation';
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
            name: 'first then continuation',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'setTimeout in 2nd then',
            children: [],
            before: 1,
            after: 0,
            error: 0
          },
          {
            name: '2nd then continuation',
            children: [],
            before: 0,
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
    listener.currentName = 'first chain continuation';
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
      listener.currentName = '2nd chain continuation';
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
            name: 'first chain continuation',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'setTimeout in 2nd chain',
            children: [],
            before: 1,
            after: 0,
            error: 0
          },
          {
            name: '2nd chain continuation',
            children: [],
            before: 0,
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
  var listener = addListner();

  var promise = new Promise(function(accept, reject) {
    listener.currentName = 'reject';
    reject(15);
  });

  listener.currentName = 'catch';
  promise.catch(function(val) {
    listener.currentName = 'nextTick in catch';
    process.nextTick(function() {
      t.strictEqual(val, 15);
    });
    listener.currentName = 'catch continuation';
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
          // some version of iojs use nextTick for some parts of its async
          if (listener.root.children.length === 3) {
            expected.children.splice(-1, 0, {
              name: 'catch',
              children: [],
              before: 1,
              after: 1,
              error: 0
            })
          }
          t.deepEqual(listener.root, expected);
          t.end();
        });
        listener.currentName = 'then continuation';
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
            name: 'catch continuation',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'setTimeout in then',
            children: [],
            before: 1,
            after: 0,
            error: 0
          },
          {
            name: 'then continuation',
            children: [],
            before: 0,
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

test('future chains', function futureChainTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve';
  var promise = Promise.resolve();

  promise
    .then(function() { listener.currentName = '1st then'; })
    .then(function() { listener.currentName = '2nd then'; })
    .then(function() { listener.currentName = '3rd then'; });

  promise
    .chain(function() { listener.currentName = '1st chain'; })
    .chain(function() { listener.currentName = '2nd chain'; })
    .chain(function() { listener.currentName = '3rd chain'; });

  listener.currentName = 'setTimeout';
  setTimeout(function() {
    t.deepEqual(listener.root, expected);
    t.end();
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'resolve',
        children: [
          {
            name: '1st then',
            children: [
              {
                name: '2nd then',
                children: [
                  {
                    name: '3rd then',
                    children: [],
                    before: 0,
                    after: 0,
                    error: 0
                  }
                ],
                before: 1,
                after: 1,
                error: 0
              }
            ],
            before: 1,
            after: 1,
            error: 0
          },
          {
            name: '1st chain',
            children: [
              {
                name: '2nd chain',
                children: [
                  {
                    name: '3rd chain',
                    children: [],
                    before: 0,
                    after: 0,
                    error: 0
                  }
                ],
                before: 1,
                after: 1,
                error: 0
              }
            ],
            before: 1,
            after: 1,
            error: 0
          }
        ],
        before: 2,
        after: 2,
        error: 0
      },
      {
        name: 'setTimeout',
        children: [],
        before: 1,
        after: 0,
        error: 0
      }
    ],
    before: 0,
    after: 0,
    error: 0
  }
});

test('Promise.resolve', function resolveTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve';
  var p = Promise.resolve(123);

  p.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      t.equal(value, 123);
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
      t.equal(value, 123);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'accept',
          children: [
            {
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            },
            {
              name: 'then continuation',
              children: [],
              before: 0,
              after: 0,
              error: 0
            }
          ],
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

    listener.currentName = 'then continuation';
  });

  process.removeAsyncListener(listener.listener);
});

test('Promise.reject', function rejectTest(t) {
  var listener = addListner();

  listener.currentName = 'reject';
  var p = Promise.reject(123);

  listener.currentName = 'catch';
  p.catch(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      t.equal(value, 123);

      // some version of iojs use nextTick for some parts of its async
      if (listener.root.children.length === 2) {
        expected.children.push({
          name: 'catch',
          children: [],
          before: 1,
          after: 1,
          error: 0
        })
      }

      t.deepEqual(listener.root, expected);
      t.end();
    });

    listener.currentName = 'catch continuation';
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [{
      name: 'reject',
      children: [
        {
          name: 'nextTick',
          children: [],
          before: 1,
          after: 0,
          error: 0
        },
        {
          name: 'catch continuation',
          children: [],
          before: 0,
          after: 0,
          error: 0
        }
      ],
      before: 1,
      after: 1,
      error: 0
    }],
    before: 0,
    after: 0,
    error: 0
  }
});

test('Promise.all', function allTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve 1';
  var a = Promise.resolve(123);
  listener.currentName = 'resolve 2';
  var b = Promise.resolve(456);
  listener.currentName = 'all';
  var p = Promise.all([a, b]);

  p.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.deepEqual(value, [123, 456]);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve 1',
          children: [{
            // Internal continuation of a used for making the race future.
            name: 'all',
            children: [],
            before: 0,
            after: 0,
            error: 0
          }],
          before: 1,
          after: 1,
          error: 0
        }, {
          name: 'resolve 2',
          children: [
            {
              name: 'all',
              children: [
                {
                  name: 'nextTick',
                  children: [],
                  before: 1,
                  after: 0,
                  error: 0
                },
                {
                  name: 'then continuation',
                  children: [],
                  before: 0,
                  after: 0,
                  error: 0
                }
              ],
              before: 1,
              after: 1,
              error: 0
            },
            {
              // Internal continuation of b used for making the race future.
              name: 'all',
              children: [],
              before: 0,
              after: 0,
              error: 0
            }
          ],
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

    listener.currentName = 'then continuation';
  });
});

test('Promise.all reject', function allTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve';
  var a = Promise.resolve(123);
  listener.currentName = 'reject';
  var b = Promise.reject(456);
  listener.currentName = 'all';
  var p = Promise.all([a, b]);

  p.catch(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      // some version of iojs use nextTick for some parts of its async
      if (listener.root.children.length === 3) {
        expected.children.push({
          name: 'all',
          children: [],
          before: 1,
          after: 1,
          error: 0
        })
      }

      process.removeAsyncListener(listener.listener);
      t.equal(value, 456);
      t.deepEqual(listener.root, expected);
      t.end();
    });

    listener.currentName = 'catch continuation';
  });

  var expected = {
    name: 'root',
    children: [{
      name: 'resolve',
      children: [{
        // Internal continuation of a used for making the race future.
        name: 'all',
        children: [],
        before: 0,
        after: 0,
        error: 0
      }],
      before: 1,
      after: 1,
      error: 0
    }, {
      name: 'reject',
      children: [
        {
          name: 'all',
          children: [
            {
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            },
            {
              name: 'catch continuation',
              children: [],
              before: 0,
              after: 0,
              error: 0
            }
          ],
          before: 1,
          after: 1,
          error: 0
        },
        {
          // Internal continuation of b used for making the race future.
          name: 'all',
          children: [],
          before: 0,
          after: 0,
          error: 0
        }
      ],
      before: 1,
      after: 1,
      error: 0
    }],
    before: 0,
    after: 0,
    error: 0
  }
});

test('Promise.race', function raceTest(t) {
  var listener = addListner();

  listener.currentName = 'resolve 1';
  var a = Promise.resolve(123);
  listener.currentName = 'resolve 2';
  var b = Promise.resolve(456);
  listener.currentName = 'race';
  var p = Promise.race([a, b]);

  p.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 123);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve 1',
          children: [
            {
              name: 'race',
              children: [
                {
                  name: 'nextTick',
                  children: [],
                  before: 1,
                  after: 0,
                  error: 0
                },
                {
                  name: 'then continuation',
                  children: [],
                  before: 0,
                  after: 0,
                  error: 0
                }
              ],
              before: 1,
              after: 1,
              error: 0
            },
            {
              // Internal continuation of a used for making the race future.
              name: 'race',
              children: [],
              before: 0,
              after: 0,
              error: 0
            }
          ],
          before: 1,
          after: 1,
          error: 0
        }, {
          name: 'resolve 2',
          children: [{
            // Internal continuation of b used for making the race future.
            name: 'race',
            children: [],
            before: 0,
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

    listener.currentName = 'then continuation';
  });
});

test('Promise.race - reject', function raceTest(t) {
  var listener = addListner();

  listener.currentName = 'reject';
  var a = Promise.reject(123);
  listener.currentName = 'resolve';
  var b = Promise.resolve(456);
  listener.currentName = 'race';
  var p = Promise.race([a, b]);

  p.catch(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 123);

      // some version of iojs use nextTick for some parts of its async
      if (listener.root.children.length === 3) {
        expected.children.push({
          name: 'race',
          children: [],
          before: 1,
          after: 1,
          error: 0
        })
      }

      t.deepEqual(listener.root, expected);
      t.end();
    });

    listener.currentName = 'catch continuation';
  });

  var expected = {
    name: 'root',
    children: [{
      name: 'reject',
      children: [
        {
          name: 'race',
          children: [
            {
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            },
            {
              name: 'catch continuation',
              children: [],
              before: 0,
              after: 0,
              error: 0
            }
          ],
          before: 1,
          after: 1,
          error: 0
        },
        {
          // Internal continuation of a used for making the race future.
          name: 'race',
          children: [],
          before: 0,
          after: 0,
          error: 0
        }
      ],
      before: 1,
      after: 1,
      error: 0
    }, {
      name: 'resolve',
      children: [{
        // Internal continuation of b used for making the race future.
        name: 'race',
        children: [],
        before: 0,
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
  }
});

test('Promise.defer', function diferTest(t) {
  var listener = addListner();

  listener.currentName = 'defer';
  var p = Promise.defer();
  listener.currentName = 'resolve';
  p.resolve(123);
  listener.currentName = 'reject';
  p.reject(456);

  p.promise.then(function then(value) {
    listener.currentName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 123);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve',
          children: [
            {
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            },
            {
              name: 'then continuation',
              children: [],
              before: 0,
              after: 0,
              error: 0
            }
          ],
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

    listener.currentName = 'then continuation';
  });
});

test('instanceof', function diferTest(t) {
  var p = Promise.accept();

  t.ok(p instanceof Promise, 'instanceof should work on wrapped Promise');
  t.ok(p instanceof unwrappedPromise, 'instanceof should work on unwrapped Promise');
  t.end()
});

test('then chain with promise', function(t) {
  var listener = addListner();

  listener.currentName = 'accept';
  var promise = Promise.accept(10);

  promise
    .then(function(val) {
      return new Promise(function wait(accept) {
        listener.currentName = 'nextTick in nested promise';
        process.nextTick(function() {
          listener.currentName = 'accept from nextTick';
          accept(val);
        });
      });
    })
    .then(function validate(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);

      listener.currentName = 'setTimeout in 2nd then';
      setTimeout(function() {
        t.deepEqual(listener.root, expected);
        t.end();
      });

      listener.currentName = '2nd then continuation';
    });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'accept',
        children: [
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'accept from nextTick',
                children: [
                  {
                    name: 'setTimeout in 2nd then',
                    children: [],
                    before: 1,
                    after: 0,
                    error: 0
                  },
                  {
                    name: '2nd then continuation',
                    children: [],
                    before: 0,
                    after: 0,
                    error: 0
                  }
                ],
                before: 1,
                after: 1,
                error: 0
              }
            ],
            before: 1,
            after: 1,
            error: 0
          }
        ],
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

test('multi chain with promise', function(t) {
  var listener = addListner();

  listener.currentName = 'accept';
  var promise = Promise.accept(10);

  promise
    .chain(function(val) {
      return new Promise(function wait(accept) {
        listener.currentName = 'nextTick in nested promise';
        process.nextTick(function() {
          listener.currentName = 'accept from nextTick';
          accept(val);
        });
      });
    })
    .chain(function validate(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);

      listener.currentName = 'setTimeout in 2nd chain';
      setTimeout(function() {
        t.deepEqual(listener.root, expected);
        t.end();
      });

      listener.currentName = '2nd then continuation';
    });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'accept',
        children: [
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'accept from nextTick',
                children: [
                  {
                    name: 'setTimeout in 2nd chain',
                    children: [],
                    before: 1,
                    after: 0,
                    error: 0
                  },
                  {
                    name: '2nd then continuation',
                    children: [],
                    before: 0,
                    after: 0,
                    error: 0
                  }
                ],
                before: 1,
                after: 1,
                error: 0
              }
            ],
            before: 1,
            after: 1,
            error: 0
          }
        ],
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

test('then chain with rejected promise', function(t) {
  var listener = addListner();

  listener.currentName = 'reject';
  var promise = Promise.reject(10);

  promise
    .then(fail, function(val) {
      return new Promise(function wait(accept, reject) {
        listener.currentName = 'nextTick in nested promise';
        process.nextTick(function() {
          listener.currentName = 'reject from nextTick';
          reject(val);
        });
      });
    })
    .then(fail, function validate(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);

      listener.currentName = 'setTimeout in 2nd then';
      setTimeout(function() {
        // some version of iojs use nextTick for some parts of its async
        if (listener.root.children.length === 2) {
          expected.children.splice(1, 0, {
            name: 'reject',
            children: [],
            before: 1,
            after: 1,
            error: 0
          })
        }

        t.deepEqual(listener.root, expected);
        t.end();
      });

      listener.currentName = '2nd then continuation';
    });

  function fail() {
    t.fail('should not be called');
    t.end();
  }

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'reject',
        children: [
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'reject from nextTick',
                children: [
                  {
                    name: 'setTimeout in 2nd then',
                    children: [],
                    before: 1,
                    after: 0,
                    error: 0
                  },
                  {
                    name: '2nd then continuation',
                    children: [],
                    before: 0,
                    after: 0,
                    error: 0
                  }
                ],
                before: 1,
                after: 1,
                error: 0
              }
            ],
            before: 1,
            after: 1,
            error: 0
          }
        ],
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

test('multi chain with rejected promise', function(t) {
  var listener = addListner();

  listener.currentName = 'reject';
  var promise = Promise.reject(10);

  promise
    .chain(fail, function(val) {
      return new Promise(function wait(accept, reject) {
        listener.currentName = 'nextTick in nested promise';
        process.nextTick(function() {
          listener.currentName = 'reject from nextTick';
          reject(val);
        });
      });
    })
    .chain(fail, function validate(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);

      listener.currentName = 'setTimeout in 2nd chain';
      setTimeout(function() {
        // some version of iojs use nextTick for some parts of its async
        if (listener.root.children.length === 2) {
          expected.children.splice(1, 0, {
            name: 'reject',
            children: [],
            before: 1,
            after: 1,
            error: 0
          })
        }

        t.deepEqual(listener.root, expected);
        t.end();
      });

      listener.currentName = '2nd chain continuation';
    });

  function fail() {
    t.fail('should not be called');
    t.end();
  }

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'reject',
        children: [
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'reject from nextTick',
                children: [
                  {
                    name: 'setTimeout in 2nd chain',
                    children: [],
                    before: 1,
                    after: 0,
                    error: 0
                  },
                  {
                    name: '2nd chain continuation',
                    children: [],
                    before: 0,
                    after: 0,
                    error: 0
                  }
                ],
                before: 1,
                after: 1,
                error: 0
              }
            ],
            before: 1,
            after: 1,
            error: 0
          }
        ],
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

test('multi catch with promise', function(t) {
  var listener = addListner();

  listener.currentName = 'reject';
  var promise = Promise.reject(10);

  promise
    .catch(function(val) {
      return new Promise(function wait(accept, reject) {
        listener.currentName = 'nextTick in nested promise';
        process.nextTick(function() {
          listener.currentName = 'reject from nextTick';
          reject(val);
        });
      });
    })
    .catch(function validate(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);

      listener.currentName = 'setTimeout in 2nd catch';
      setTimeout(function() {
        // some version of iojs use nextTick for some parts of its async
        if (listener.root.children.length === 2) {
          expected.children.splice(1, 0, {
            name: 'reject',
            children: [],
            before: 1,
            after: 1,
            error: 0
          })
        }

        t.deepEqual(listener.root, expected);
        t.end();
      });

      listener.currentName = '2nd catch continuation';
    });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'reject',
        children: [
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'reject from nextTick',
                children: [
                  {
                    name: 'setTimeout in 2nd catch',
                    children: [],
                    before: 1,
                    after: 0,
                    error: 0
                  },
                  {
                    name: '2nd catch continuation',
                    children: [],
                    before: 0,
                    after: 0,
                    error: 0
                  }
                ],
                before: 1,
                after: 1,
                error: 0
              }
            ],
            before: 1,
            after: 1,
            error: 0
          }
        ],
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

test('throw in executor', function(t) {
  var listener = addListner();

  var promise = new Promise(function unsafe() {
    listener.currentName = 'throw';
    throw 10;
  });

  promise.catch(function(val) {
    t.equal(val, 10, 'should match thrown value')
    if (listener.root.children.length === 2) {
      expected.children.splice(1, 0, {
        name: 'throw',
        children: [],
        before: 0,
        after: 0,
        error: 0
      })
    }

    t.deepEqual(listener.root, expected);
    t.end();
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'throw',
        children: [
        ],
        before: 1,
        after: 0,
        error: 0
      }
    ],
    before: 0,
    after: 0,
    error: 0
  }
});

test('Promise.resolve().catch().then()', function (t) {
  var listenerState = addListner();

  t.plan(1);
  listenerState.currentName = 'resolve'
  var p = Promise.resolve(1)

  listenerState.currentName = 'return of 1st catch that didnt get run'
  p = p.catch(function () {})

  p = p.then(function () {
    listenerState.currentName = 'returned by 1st then'
    throw new Error()
  })

  p = p.catch(function () {
    listenerState.currentName = 'returned by 2nd catch'
    throw new Error
  });

  p = p.then(function () {}, function () {
    listenerState.currentName = 'returned by 2nd then'
    throw new Error()
  });

  p = p.catch(function () {
    t.deepEqual(listenerState.root, expected);
  });

  var expected = {
      name: 'root',
      children: [
        {
          name: 'resolve',
          children: [
            {
              name: 'return of 1st catch that didnt get run',
              children: [
                {
                  name: 'returned by 1st then',
                  children: [
                    {
                      name: 'returned by 2nd catch',
                      children: [
                        {
                          name: 'returned by 2nd then',
                          children: [],
                          before: 1,
                          after: 0,
                          error: 0
                        }
                      ],
                      before: 1,
                      after: 1,
                      error: 0
                    }
                  ],
                  before: 1,
                  after: 1,
                  error: 0
                }
              ],
              before: 1,
              after: 1,
              error: 0
            }
          ],
          before: 1,
          after: 1,
          error: 0
        }
      ],
      before: 0,
      after: 0,
      error: 0
    }

    process.removeAsyncListener(listenerState.listener);
});

test('continue from unwrapped promise', function(t) {
  var listener = addListner();

  listener.currentName = 'resolve';
  resolvedBeforeWrap.then(function(val) {
    t.equal(val, 123, 'should match resolved value');
    listener.currentName = '2nd resolve';
    return 456;
  }).then(function (val) {
    t.equal(val, 456, 'should match resolved value');
    t.deepEqual(listener.root, expected);
    t.end();
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [],
    before: 0,
    after: 0,
    error: 0
  };
});

test('return unwrapped promise', function(t) {
  var listener = addListner();

  listener.currentName = 'resolve';
  Promise.resolve(890).then(function (val) {
    t.equal(val, 890, 'should match resolved value');
    return resolvedBeforeWrap;
  }).then(function(val) {
    t.equal(val, 123, 'should match resolved value');
    return 456;
  }).then(function (val) {
    t.equal(val, 456, 'should match resolved value');
    t.deepEqual(listener.root, expected);
    t.end();
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [{
      name : 'resolve',
      children : [],
      before : 1,
      after : 1,
      error : 0
    }],
    before: 0,
    after: 0,
    error: 0
  };
});

test('resume context after unwrapped promise', function(t) {
  var listener = addListner();

  listener.currentName = 'resolve';
  var wrapped = Promise.resolve(456)

  listener.currentName = 'unwrapped resolve';
  resolvedBeforeWrap.then(function(val) {
    t.equal(val, 123, 'should match resolved value');
    return wrapped
  }).then(function (val) {
    t.equal(val, 456, 'should match resolved value');
    listener.currentName = 'return after continuing from wrapped promise';
    return 89
  }).then(function (val) {
    t.equal(val, 89, 'should match resolved value');
    t.deepEqual(listener.root, expected);
    t.end();
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [{
      name : 'resolve',
      children : [{
        name : 'return after continuing from wrapped promise',
        children : [],
        before : 1,
        after : 0,
        error : 0
      }],
      before : 1,
      after : 1,
      error : 0
    }],
    before: 0,
    after: 0,
    error: 0
  };
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
    currentName: 'root'
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
