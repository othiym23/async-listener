var wrap = require('shimmer').wrap;

var listeners = [];
var uid = 0;

/**
 * Throwing always happens synchronously. If the current array of values for
 * the current list of asyncListeners is put in a module-scoped variable right
 * before a call that can throw, it will always be correct when the error
 * handlers are run.
 */
var errorData = null;
var inAsyncTick = false, inErrorTick = false;
function asyncErrorHandler(er) {
  if (inErrorTick) return false;
  if (!listeners || listeners.length === 0) return false;

  var handled = false;

  inErrorTick = true;
  var length = listeners.length;
  for (var i = 0; i < length; ++i) {
    if (!listeners[i].callbacks) continue;

    var error = listeners[i].callbacks.error;
    var value = errorData && errorData[i];
    if (typeof error === 'function') handled = error(value, er) || handled;
  }
  inErrorTick = false;

  return handled && !inAsyncTick;
}

if (process._fatalException) {
  wrap(process, '_fatalException', function (_fatalException) {
    return function _asyncFatalException(er) {
      return asyncErrorHandler(er) || _fatalException(er);
    };
  });
}
else {
  // will be the first to fire if async-listener is the first module loaded
  process.on('uncaughtException', function _asyncUncaughtException(er) {
    return asyncErrorHandler(er) || false;
  });
}

function asyncWrap(original, list, length) {
  var data = [];
  inAsyncTick = true;
  for (var i = 0; i < length; ++i) {
    /* asyncListener.domain is the default value passed through before and
     * after if the listener doesn't return a value.
     */
    data[i] = list[i].domain;
    var value = list[i].listener.call(this);
    if (typeof value !== 'undefined') data[i] = value;
  }
  inAsyncTick = false;

  return function () {
    inAsyncTick = true;
    for (var i = 0; i < length; ++i) {
      var before = list[i].callbacks && list[i].callbacks.before;
      if (before) before(this, data[i]);
    }
    inAsyncTick = false;

    // stash for error handling
    errorData = data;
    listeners = list.slice();

    // save the return value to pass to the after callbacks
    var returned = original.apply(this, arguments);

    inAsyncTick = true;
    for (i = 0; i < length; ++i) {
      var after = list[i].callbacks && list[i].callbacks.after;
      if (after) after(this, data[i], returned);
    }
    inAsyncTick = false;
    return returned;
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

function createAsyncListener(listener, callbacks, value) {
  return {
    listener  : listener,
    callbacks : callbacks,
    domain    : value,
    uid       : uid++
  };
}

function addAsyncListener(listener, callbacks, value) {
  var asyncListener;
  if (typeof listener === 'function') {
    asyncListener = createAsyncListener(listener, callbacks, value);
  }
  else {
    asyncListener = listener;
  }

  // Make sure the asyncListener isn't already in the list.
  var registered = false;
  for (var i = 0; i < listeners.length; i++) {
    if (asyncListener.uid === listeners[i].uid) {
      registered = true;
      break;
    }
  }

  if (!registered) listeners.push(asyncListener);

  return asyncListener;
}

function removeAsyncListener(listener) {
  for (var i = 0; i < listeners.length; i++) {
    if (listener.uid === listeners[i].uid) {
      listeners.splice(i, 1);
      break;
    }
  }
}

process.createAsyncListener = createAsyncListener;
process.addAsyncListener    = addAsyncListener;
process.removeAsyncListener = removeAsyncListener;

module.exports = wrapCallback;
