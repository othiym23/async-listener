var wrap = require('shimmer').wrap;

var listeners = [];

if (process._fatalException) {
  wrap(process, '_fatalException', function (_fatalException) {
    return function _asyncFatalException(er) {
      var length = listeners.length;
      for (var i = 0; i < length; ++i) {
        var callbacks = listeners[i].callbacks;
        // FIXME: find the actual domain element
        var domain = {};
        if (callbacks.error && callbacks.error(domain, er)) {
          process._needTickCallback();
          return true;
        }
      }

      return _fatalException(er);
    };
  });
}
else {
  process.on('uncaughtException', function _asyncUncaughtException(er) {
    var length = listeners.length;
    for (var i = 0; i < length; ++i) {
      var callbacks = listeners[i].callbacks;
      // FIXME: find the actual domain element
      var domain = {};
      if (callbacks.error && callbacks.error(domain, er)) {
        process._needTickCallback();
        return true;
      }
    }

    return false;
  });
}

function runSetup(list, length) {
  var data = new Array(length);
  for (var i = 0; i < length; ++i) {
    data[i] = list[i].listener.call(this);
  }
  return data;
}

function runBefore(data, list, length, context) {
  for (var i = 0; i < length; ++i) {
    var callbacks = list[i].callbacks;
    if (callbacks && callbacks.before) callbacks.before(context, data[i]);
  }
}

function runAfter(data, list, length, context) {
  for (var i = 0; i < length; ++i) {
    var callbacks = list[i].callbacks;
    if (callbacks && callbacks.after) callbacks.after(context, data[i]);
  }
}

function normalWrap(original, list, length) {
  var data = runSetup(list, length);
  return function () {
    runBefore(data, list, length, this);
    try {
      return original.apply(this, arguments);
    }
    finally {
      runAfter(data, list, length, this);
    }
  };
}

function noWrap(original, list, length) {
  for (var i = 0; i < length; ++i) list[i].listener();
  return original;
}

function wrapCallback(original) {
  var list = listeners.slice();
  var length = list.length;
  for (var i = 0; i < length; ++i) {
    if (list[i].callbacks) return normalWrap(original, list, length);
  }

  return noWrap(original, list, length);
}

function createAsyncListener(listener, callbacks, domain) {
  return {
    listener  : listener,
    callbacks : callbacks,
    domain    : domain
  };
}

function addAsyncListener(listener, callbacks, domain) {
  if (typeof listener === 'function') {
    callbacks = createAsyncListener(listener, callbacks, domain);
  }
  else {
    callbacks = listener;
  }

  listeners.push(callbacks);

  return callbacks;
}

function removeAsyncListener(listener) {
  var index = listeners.indexOf(listener);
  if (index >= 0) listeners.splice(index, 1);
}

process.createAsyncListener = createAsyncListener;
process.addAsyncListener    = addAsyncListener;
process.removeAsyncListener = removeAsyncListener;

module.exports = wrapCallback;
