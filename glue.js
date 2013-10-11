var wrap = require('shimmer').wrap;

var listeners = [];
// this only works because throwing is synchronous. It's not a good idea.
var _curData;

if (process._fatalException) {
  wrap(process, '_fatalException', function (_fatalException) {
    return function _asyncFatalException(er) {
      var length = listeners.length;
      for (var i = 0; i < length; ++i) {
        var callbacks = listeners[i].callbacks;
        var domain = {};
        if (_curData && _curData[i]) domain = _curData[i];
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
      var domain = {};
      if (_curData && _curData[i]) domain = _curData[i];
      if (callbacks.error && callbacks.error(domain, er)) {
        process._needTickCallback();
        return true;
      }
    }

    return false;
  });
}

function asyncWrap(original, list, length) {
  // setup
  var data = [];
  for (var i = 0; i < length; ++i) {
    data[i] = list[i].listener.call(this);
  }

  return function () {
    var i, callbacks, returned;

    // call `before`
    for (i = 0; i < length; ++i) {
      callbacks = list[i].callbacks;
      if (callbacks && callbacks.before) callbacks.before(this, data[i]);
    }

    var threw = true;
    try {
      // save returned to pass to `after`
      _curData = data;
      returned = original.apply(this, arguments);
      threw = false;
      return returned;
    }
    finally {
      if (!threw) {
        // call `after`
        for (i = 0; i < length; ++i) {
          callbacks = list[i].callbacks;
          if (callbacks && callbacks.after) callbacks.after(this, data[i], returned);
        }
      }
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
    if (list[i].callbacks) return asyncWrap(original, list, length);
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
