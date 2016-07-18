if (!process.addAsyncListener) require('../index.js');

var test = require('tap').test;
var http = require('http');

// Convert semver string to number set
// TODO: This version check is *very* naive, but works well enough for now...
var nodeVersion = process.version.slice(1).split('.').map(Number)

test('http.Agent socket reuse works', function(t){
  function main (done) {
    var listener = addListner();
    var times = 2;

    var agent = new http.Agent({
      keepAlive: true,
      maxFreeSockets: 1,
      maxSockets: 1
    });

    function after(rand, i) {
      if (--times === 0) {
        t.deepEqual(
          listener.root,
          expected,
          'should have equal state structures'
        );
        agent.destroy();
        done();
      }
    }

    function ping(i) {
      listener.currentName = 'ping #' + i + ' request';
      var req = http.request({
        agent: agent,
        port: server.address().port,
        path: '/sub'
      }, function (res) {
        // The second request is a logical continuation of
        // the first request, due to the http.Agent pooling
        if (i === 0) {
          t.equal(
            listener.current.name,
            'ping #' + i + ' request',
            'should be ping #' + i + ' request'
          );
        } else {
          t.equal(
            listener.current.name,
            'setImmediate to after #' + (i - 1),
            'should be setImmediate to after #' + (i - 1)
          );
        }

        listener.currentName = 'res.resume ping #' + i;
        res.resume();
        res.on('end', function () {
          t.equal(
            listener.current.name,
            'res.resume ping #' + i,
            'should be res.resume ping #' + i
          );
          listener.currentName = 'setImmediate to after #' + i;
          setImmediate(after, i);
        });
      });
      listener.currentName = 'req.end ping #' + i;
      req.end();
    }

    for (var i = 0; i < times; i++) {
      listener.currentName = 'setImmediate #' + i;
      setImmediate(ping, i);
    }

    process.removeAsyncListener(listener.listener);

    var expected = {
      name: 'root',
      children: [
        // One of these listens is a process.nextTick.
        {
          name: 'setImmediate #0',
          children: [
            // http.request
            {
              name: 'ping #0 request',
              children: [
                {
                  name: 'ping #0 request',
                  children: [
                    {
                      name: 'res.resume ping #0',
                      children: [
                        {
                          name: 'res.resume ping #0',
                          children: [
                            {
                              name: 'res.resume ping #0',
                              children: [],
                              before: 1,
                              after: 1,
                              error: 0
                            },
                            {
                              name: 'setImmediate to after #0',
                              children: [],
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
                          name: 'res.resume ping #0',
                          children: [],
                          before: 1,
                          after: 1,
                          error: 0
                        },
                        {
                          name: 'res.resume ping #0',
                          children: [],
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
                      name: 'res.resume ping #0',
                      children: nodeVersion[0] < 6 ? [] : [
                        {
                          name: 'res.resume ping #0',
                          children: [],
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
                      name: 'res.resume ping #0',
                      children: nodeVersion[0] >= 6 ? [] : [
                        {
                          name: 'res.resume ping #0',
                          children: [],
                          before: 1,
                          after: 1,
                          error: 0
                        }
                      ],
                      before: 1,
                      after: 1,
                      error: 0
                    },
                  ].concat(nodeVersion[0] >= 6 ? [] : [
                    {
                      name: 'res.resume ping #0',
                      children: [],
                      before: 1,
                      after: 1,
                      error: 0
                    }
                  ]),
                  before: 1,
                  after: 1,
                  error: 0
                },
                {
                  name: 'ping #0 request',
                  children: [
                    {
                      name: 'req.end ping #1',
                      children: [],
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
            // Socket.connect
            {
              name: 'ping #0 request',
              children: [],
              before: 1,
              after: 1,
              error: 0
            }
          ].concat(nodeVersion[0] < 5 ? [] : [
            // Socket.connect (lookupAndConnect)
            {
              name: 'ping #0 request',
              children: [],
              before: 1,
              after: 1,
              error: 0
            }
          ]).concat([
            // Socket.connect
            {
              name: 'ping #0 request',
              children: [],
              before: 0,
              after: 0,
              error: 0
            }
          ]),
          before: 1,
          after: 1,
          error: 0
        },
        {
          name: 'setImmediate #1',
          children: [
            // http.request
            {
              name: 'ping #1 request',
              children: [
                {
                  name: 'setImmediate to after #0',
                  children: [
                    {
                      name: 'res.resume ping #1',
                      children: [
                        {
                          name: 'res.resume ping #1',
                          children: [
                            {
                              name: 'res.resume ping #1',
                              children: [],
                              before: 1,
                              after: 1,
                              error: 0
                            },
                            {
                              name: 'setImmediate to after #1',
                              children: [],
                              before: 1,
                              after: 0,
                              error: 0
                            }
                          ],
                          before: 1,
                          after: 1,
                          error: 0
                        },
                        {
                          name: 'res.resume ping #1',
                          children: [],
                          before: 1,
                          after: 1,
                          error: 0
                        },
                        {
                          name: 'res.resume ping #1',
                          children: [],
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
                      name: 'res.resume ping #1',
                      children: nodeVersion[0] < 6 ? [] : [
                        {
                          name: 'res.resume ping #1',
                          children: [],
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
                      name: 'res.resume ping #1',
                      children: nodeVersion[0] >= 6 ? [] : [
                        {
                          name: 'res.resume ping #1',
                          children: [],
                          before: 1,
                          after: 1,
                          error: 0
                        }
                      ],
                      before: 1,
                      after: 1,
                      error: 0
                    }
                  ].concat(nodeVersion[0] >= 6 ? [] : [
                    {
                      name: 'res.resume ping #1',
                      children: [],
                      before: 1,
                      after: 1,
                      error: 0
                    }
                  ]),
                  before: 1,
                  after: 1,
                  error: 0
                },
                {
                  name: 'setImmediate to after #0',
                  children: [
                    {
                      name: 'setImmediate to after #0',
                      children: [],
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
    };
  }

  var server = http.createServer(function (req, res) {
    res.end('hello');
  });

  //
  // Test client
  //
  server.listen(function () {
    main(function () {
      server.close();
      server.on('close', function () {
        t.end();
      });
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
