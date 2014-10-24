var test = require('tap').test;
var exec = require('child_process').exec;

var files = [
  'core-asynclistener-error-multiple-handled.simple.js',
  'core-asynclistener-error-multiple-mix.simple.js',
  'core-asynclistener-error-multiple-unhandled.simple.js',
  'core-asynclistener-error-net.simple.js',
  'core-asynclistener-error-throw-in-after.simple.js',
  'core-asynclistener-error-throw-in-before-multiple.simple.js',
  'core-asynclistener-error-throw-in-before.simple.js',
  'core-asynclistener-error-throw-in-error.simple.js',
  'core-asynclistener-error.simple.js',
  'core-asynclistener-nexttick-remove.simple.js',
  'core-asynclistener-only-add.simple.js',
  'core-asynclistener-remove-before.simple.js',
  'core-asynclistener-remove-inflight-error.simple.js',
  'core-asynclistener-remove-inflight.simple.js',
  'core-asynclistener.simple.js',
  'simplified-error.simple.js',
  'core/core-asynclistener-add-inflight.js',
  'core/core-asynclistener-error-throw-in-before-inflight.js'
];

test('passes core tests', function (t) {
  t.plan(files.length)

  next()

  function next() {
    if(files.length) {
      run(files.pop(), next)
    }
  }

  function run(file, done) {
    exec('node ' + file, {cwd: __dirname}, function(err, stdout, stderr) {
      if(err) {
        t.fail(err)
      } else if(stderr) {
        t.fail(strderr)
      } else {
        t.ok(stdout)
      }

      done()
    })
  }
})
