if (!global.Promise) return;

var test = require('tap').test;

var unwrappedPromise = global.Promise;

require('../index.js');


test('then', function(t) {
  var listener = addListner();

  var promise = new Promise(function(accept, reject) {
    listener.nextName = 'accept';
    accept(10);
  });

  promise.then(function(val) {
    listener.nextName = 'nextTick in first then';
    process.nextTick(function() {
      t.strictEqual(val, 10);
    });
    listener.nextName = 'first then continuation';
  });

  listener.nextName = 'setImmediate in root';
  setImmediate(function() {
    promise.then(function(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);
      listener.nextName = 'setTimeout in 2nd then';
      setTimeout(function() {
        t.deepEqual(listener.root, expected);
        t.end();
      });
    });
  });

  listener.nextName = 'internal promise for then';

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'accept',
        children: [
          {
            name: 'internal promise for then',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
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
    listener.nextName = 'accept';
    accept(10);
  });

  promise.chain(function(val) {
    listener.nextName = 'nextTick in first chain';
    process.nextTick(function() {
      t.strictEqual(val, 10);
    });
    listener.nextName = 'first chain continuation';
  });

  listener.nextName = 'setImmediate in root';
  setImmediate(function() {
    promise.chain(function(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);
      listener.nextName = 'setTimeout in 2nd chain';
      setTimeout(function() {
        t.deepEqual(listener.root, expected);
        t.end();
      });
    });
  });

  listener.nextName = 'internal promise for chain'

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'accept',
        children: [
          {
            name: 'internal promise for chain',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
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
    listener.nextName = 'reject';
    reject(15);
  });

  listener.nextName = 'catch';
  promise.catch(function(val) {
    listener.nextName = 'nextTick in catch';
    process.nextTick(function() {
      t.strictEqual(val, 15);
    });
    listener.nextName = 'catch continuation';
  });

  listener.nextName = 'setImmediate in root';
  setImmediate(function() {
    promise.then(
      function fullfilled() {
        throw new Error('should not be called on reject');
      },
      function rejected(val) {
        t.strictEqual(val, 15);
        t.strictEqual(this, global);
        listener.nextName = 'setTimeout in then';
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
      }
    )
  });

  listener.nextName = 'internal promise for catch';

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'reject',
        children: [
          {
            name: 'internal promise for catch',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
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

  listener.nextName = 'resolve';
  var promise = Promise.resolve();

  // listener.currenName set the name of the next Promise to be create, it may
  // (and will in this case) be part of a different continuation chain.

  // could not find a way to properly naming 3rd then/chain
  promise
    .then(function() { })
    .then(function() { listener.current.name = '1st then'; listener.nextName = '3rd'})
    .then(function() { listener.current.name = '2nd then'; });

  promise
    .chain(function() {  })
    .chain(function() { listener.current.name = '1st chain'; listener.nextName = '3rd' })
    .chain(function() { listener.current.name = '2nd chain'; });


  listener.nextName = 'setTimeout';
  setTimeout(function() {
    t.deepEqual(listener.root, expected);
    t.end();
  });

  listener.nextName = 'unknown';

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
                    name: '3rd',
                    children: [
                    ],
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
                    name: '3rd',
                    children: [
                    ],
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

  listener.nextName = 'resolve';
  var p = Promise.resolve(123);

  listener.nextName = 'internal then'

  p.then(function then(value) {
    listener.nextName = 'nextTick';
    process.nextTick(function next() {
      t.equal(value, 123);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve',
          children: [{
            name: 'internal then',
            children: [],
            before: 0,
            after: 0,
            error: 0
          }, {
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

  listener.nextName = 'accept';
  var p = Promise.accept(123);

  listener.nextName = 'internal then';

  p.then(function then(value) {
    listener.nextName = 'nextTick';
    process.nextTick(function next() {
      t.equal(value, 123);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'accept',
          children: [
            {
              name: 'internal then',
              children: [],
              before: 0,
              after: 0,
              error: 0
            },
            {
              name: 'nextTick',
              children: [],
              before: 1,
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

    listener.nextName = 'then continuation';
  });

  process.removeAsyncListener(listener.listener);
});

test('Promise.reject', function rejectTest(t) {
  var listener = addListner();

  listener.nextName = 'reject';
  var p = Promise.reject(123);

  listener.nextName = 'catch';

  p.catch(function then(value) {
    listener.nextName = 'nextTick';
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

    listener.nextName = 'catch continuation';
  });

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [{
      name: 'reject',
      children: [
        {
          name: 'catch',
          children: [],
          before: 0,
          after: 0,
          error: 0
        },
        {
          name: 'nextTick',
          children: [],
          before: 1,
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

  listener.nextName = 'resolve 1';
  var a = Promise.resolve(123);
  listener.nextName = 'resolve 2';
  var b = Promise.resolve(456);
  listener.nextName = 'all';
  var p = Promise.all([a, b]);

  listener.nextName = 'internal promise creation'

  p.then(function then(value) {
    listener.nextName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.deepEqual(value, [123, 456]);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve 1',
          children: [{
            // Internal continuation of a used for making the race future.
            name: 'internal promise creation',
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
              // Internal continuation of b used for making the race future.
              name: 'internal promise creation',
              children: [
              ],
              before: 0,
              after: 0,
              error: 0
            },
            {
              // Internal continuation of b used for making the race future.
              name: 'internal promise creation',
              children: [
                {
                  // Internal continuation of b used for making the race future.
                  name: 'internal promise creation',
                  children: [
                  ],
                  before: 0,
                  after: 0,
                  error: 0
                },
                {
                  name: 'nextTick',
                  children: [
                  ],
                  before: 1,
                  after: 0,
                  error: 0
                }
              ],
              before: 1,
              after: 1,
              error: 0
            },
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
  });
});

test('Promise.all reject', function allTest(t) {
  var listener = addListner();

  listener.nextName = 'resolve';
  var a = Promise.resolve(123);
  listener.nextName = 'reject';
  var b = Promise.reject(456);
  listener.nextName = 'all';
  var p = Promise.all([a, b]);

  p.catch(function then(value) {
    listener.nextName = 'nextTick';
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

    listener.nextName = 'catch continuation';
  });

  listener.nextName = 'internal promise';

  var expected = {
    name: 'root',
    children: [{
      name: 'resolve',
      children: [{
        // Internal continuation of a used for making the race future.
        name: 'internal promise',
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
          name: 'internal promise',
          children: [],
          before: 0,
          after: 0,
          error: 0
        },
        {
          // Internal continuation of b used for making the race future.
          name: 'internal promise',
          children: [
            {
              name: 'internal promise',
              children: [],
              before: 0,
              after: 0,
              error: 0
            },
            {
              name: 'nextTick',
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
    }],
    before: 0,
    after: 0,
    error: 0
  }
});

test('Promise.race', function raceTest(t) {
  var listener = addListner();

  listener.nextName = 'resolve 1';
  var a = Promise.resolve(123);
  listener.nextName = 'resolve 2';
  var b = Promise.resolve(456);
  listener.nextName = 'race';
  var p = Promise.race([a, b]);

  listener.nextName = 'internal promise';

  p.then(function then(value) {
    listener.nextName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 123);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve 1',
          children: [
            {
              name: 'internal promise',
              children: [],
              before: 0,
              after: 0,
              error: 0
            },
            {
              name: 'internal promise',
              children: [
                {
                  name: 'internal promise',
                  children: [],
                  before: 0,
                  after: 0,
                  error: 0
                },
                {
                  name: 'nextTick',
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
        }, {
          name: 'resolve 2',
          children: [{
            // Internal continuation of b used for making the race future.
            name: 'internal promise',
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

    listener.nextName = 'then continuation';
  });
});

test('Promise.race - reject', function raceTest(t) {
  var listener = addListner();

  listener.nextName = 'reject';
  var a = Promise.reject(123);
  listener.nextName = 'resolve';
  var b = Promise.resolve(456);
  listener.nextName = 'race';
  var p = Promise.race([a, b]);

  listener.nextName = 'internal promise'

  p.catch(function then(value) {
    listener.nextName = 'nextTick';
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

    listener.nextName = 'catch continuation';
  });

  var expected = {
    name: 'root',
    children: [{
      name: 'reject',
      children: [
        {
          name: 'internal promise',
          children: [],
          before: 0,
          after: 0,
          error: 0
        },
        {
          name: 'internal promise',
          children: [  {
              name: 'internal promise',
              children: [],
              before: 0,
              after: 0,
              error: 0
            },
            {
              name: 'nextTick',
              children: [],
              before: 1,
              after: 0,
              error: 0
            }],
          before: 1,
          after: 1,
          error: 0
        }
      ],
      before: 1,
      after: 1,
      error: 0
    }, {
      name: 'resolve',
      children: [{
        name: 'internal promise',
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

  listener.nextName = 'defer';
  var p = Promise.defer();
  listener.nextName = 'resolve';
  p.resolve(123);
  listener.nextName = 'reject';
  p.reject(456);

  listener.nextName = 'internal promise'

  p.promise.then(function then(value) {
    listener.nextName = 'nextTick';
    process.nextTick(function next() {
      process.removeAsyncListener(listener.listener);
      t.equal(value, 123);
      t.deepEqual(listener.root, {
        name: 'root',
        children: [{
          name: 'resolve',
          children: [
            {
              name: 'internal promise',
              children: [],
              before: 0,
              after: 0,
              error: 0
            },
            {
              name: 'nextTick',
              children: [],
              before: 1,
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

    listener.nextName = 'then continuation';
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

  listener.nextName = 'accept'
  var promise = Promise.accept(10);

  listener.nextName = 'internal promise'

  promise.then(function(val) {
    return new Promise(function wait(accept) {
      listener.nextName = 'nextTick in nested promise';
      process.nextTick(function() {
        listener.nextName = 'accept from nextTick';
        accept(val);
        listener.nextName = 'internal promise after accept';
      });
    });
  }).then(function validate(val) {
    t.strictEqual(val, 10);
    t.strictEqual(this, global);
    listener.nextName = 'setTimeout in 2nd then';
    setTimeout(function() {
      t.deepEqual(listener.root, expected);
      t.end();
    });
  });

  listener.nextName = 'internal promise for then';

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'accept',
        children: [
          {
            name: 'internal promise for then',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'accept from nextTick',
                children: [
                  {
                    name: 'internal promise after accept',
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

  listener.nextName = 'accept'
  var promise = Promise.accept(10);

  listener.nextName = 'internal promise'

  promise.chain(function(val) {
    return new Promise(function wait(accept) {
      listener.nextName = 'nextTick in nested promise';
      process.nextTick(function() {
        listener.nextName = 'accept from nextTick';
        accept(val);
        listener.nextName = 'internal promise after accept';
      });
    });
  }).chain(function validate(val) {
    t.strictEqual(val, 10);
    t.strictEqual(this, global);
    listener.nextName = 'setTimeout in 2nd chain';
    setTimeout(function() {
      t.deepEqual(listener.root, expected);
      t.end();
    });
  });

  listener.nextName = 'internal promise for chain';

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'accept',
        children: [
          {
            name: 'internal promise for chain',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'accept from nextTick',
                children: [
                  {
                    name: 'internal promise after accept',
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

  listener.nextName = 'reject'
  var promise = Promise.reject(10);

  listener.nextName = 'internal promise'

  promise.then(fail, function(val) {
    return new Promise(function wait(accept, reject) {
      listener.nextName = 'nextTick in nested promise';
      process.nextTick(function() {
        listener.nextName = 'reject from nextTick';
        reject(val);
        listener.nextName = 'internal promise after reject';
      });
    });
  }).then(fail, function validate(val) {
    t.strictEqual(val, 10);
    t.strictEqual(this, global);
    listener.nextName = 'setTimeout in 2nd then';
    setTimeout(function() {
      t.deepEqual(listener.root, expected);
      t.end();
    });
  });

  function fail() {
    t.fail('should not be called');
    t.end();
  }

  listener.nextName = 'internal promise for then';

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'reject',
        children: [
          {
            name: 'internal promise for then',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'reject from nextTick',
                children: [
                  {
                    name: 'internal promise after reject',
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
      },
      {
        name: 'internal promise',
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

test('multi chain with rejected promise', function(t) {
  var listener = addListner();

  listener.nextName = 'reject'
  var promise = Promise.reject(10);

  listener.nextName = 'internal promise'

  promise.chain(fail, function(val) {
    return new Promise(function wait(accept, reject) {
      listener.nextName = 'nextTick in nested promise';
      process.nextTick(function() {
        listener.nextName = 'reject from nextTick';
        reject(val);
        listener.nextName = 'internal promise after reject';
      });
    });
  }).chain(fail, function validate(val) {
    t.strictEqual(val, 10);
    t.strictEqual(this, global);
    listener.nextName = 'setTimeout in 2nd chain';
    setTimeout(function() {
      t.deepEqual(listener.root, expected);
      t.end();
    });
  });

  function fail() {
    t.fail('should not be called');
    t.end();
  }

  listener.nextName = 'internal promise for chain';

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'reject',
        children: [
          {
            name: 'internal promise for chain',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'reject from nextTick',
                children: [
                  {
                    name: 'internal promise after reject',
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
      },
      {
        name: 'internal promise',
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

test('multi catch with promise', function(t) {
  var listener = addListner();

  listener.nextName = 'reject'
  var promise = Promise.reject(10);

  listener.nextName = 'internal promise'

  promise.catch(function(val) {
    return new Promise(function wait(accept, reject) {
      listener.nextName = 'nextTick in nested promise';
      process.nextTick(function() {
        listener.nextName = 'reject from nextTick';
        reject(val);
        listener.nextName = 'internal promise after reject';
      });
    });
  }).catch(function validate(val) {
    t.strictEqual(val, 10);
    t.strictEqual(this, global);
    listener.nextName = 'setTimeout in 2nd chain';
    setTimeout(function() {
      t.deepEqual(listener.root, expected);
      t.end();
    });
  });

  function fail() {
    t.fail('should not be called');
    t.end();
  }

  listener.nextName = 'internal promise for chain';

  process.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'reject',
        children: [
          {
            name: 'internal promise for chain',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'nextTick in nested promise',
            children: [
              {
                name: 'reject from nextTick',
                children: [
                  {
                    name: 'internal promise after reject',
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
      },
      {
        name: 'internal promise',
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

function addListner() {
  var listener = process.addAsyncListener({
    create: create,
    before: before,
    after: after,
    error: error
  });


  var state = {
    listener: listener,
    nextName: 'root'
  };

  state.root = create();
  state.current = state.root;

  return state;

  function create () {
    var node = {
      name: state.nextName,
      children: [],
      before: 0,
      after: 0,
      error: 0,
    };

    if (state.current) state.current.children.push(node);
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
