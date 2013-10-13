var wrap = require('shimmer').wrap;

/**
 * There is one list of currently active listeners that is mutated in place by
 * addAsyncListener and removeAsyncListener. This complicates error-handling,
 * for reasons that are discussed below.
 */
var listeners = [];

/**
 * There can be multiple listeners with the same properties, so disambiguate
 * them by assigning them an ID at creation time.
 */
var uid = 0;

/**
 * Ensure that errors coming from within listeners are handed off to domains,
 * process._fatalException, or uncaughtException without being treated like
 * user errors.
 */
var inAsyncTick = false;

/**
 * Error handlers on listeners can throw, the the catcher needs to be able to
 * discriminate between exceptions thrown by user code, and exceptions coming
 * from within the catcher itself. Use a global to keep track of which state
 * the catcher is currently in.
 */
var inErrorTick = false;

/**
 * Throwing always happens synchronously. If the current array of values for
 * the current list of asyncListeners is put in a module-scoped variable right
 * before a call that can throw, it will always be correct when the error
 * handlers are run.
 */
var errorValues;

/**
 * Because asynchronous contexts can be nested, and errors can come from anywhere
 * in the stack, a little extra work is required to keep track of where in the
 * nesting we are. Because JS arrays are frequently mutated in place
 */
var listenerStack = [];

/**
 * The error handler on a listener can capture errors thrown during synchronous
 * execution immediately after the listener is added. To capture both
 * synchronous and asynchronous errors, the error handler just uses the
 * "global" list of active listeners, and the rest of the code ensures that the
 * listener list is correct by using a stack of listener lists during
 * asynchronous execution.
 */
function asyncCatcher(er) {
  var length = listeners.length;
  if (inErrorTick || length === 0) return false;

  var handled = false;

  /*
   * error handlers
   */
  inErrorTick = true;
  for (var i = 0; i < length; ++i) {
    if (!listeners[i].callbacks) continue;

    var error = listeners[i].callbacks.error;
    var value = errorValues && errorValues[i];
    if (typeof error === 'function') handled = error(value, er) || handled;
  }
  inErrorTick = false;

  /* Test whether there are any listener arrays on the stack. In the case of
   * synchronous throws when the listener is active, there may have been
   * none pushed yet.
   */
  if (listenerStack.length > 0) listeners = listenerStack.pop();
  errorValues = undefined;

  return handled && !inAsyncTick;
}

// 0.9+
if (process._fatalException) {
  wrap(process, '_fatalException', function (_fatalException) {
    return function _asyncFatalException(er) {
      return asyncCatcher(er) || _fatalException(er);
    };
  });
}
// 0.8 and below
else {
  // will be the first to fire if async-listener is the first module loaded
  process.on('uncaughtException', function _asyncUncaughtException(er) {
    return asyncCatcher(er) || false;
  });
}

/**
 * Simple helper function that's probably faster than using Array
 * filter methods and can be inlined.
 */
function union(dest, destLength, added, addedLength) {
  var returned = [];

  if (destLength === 0 && addedLength === 0) return returned;

  for (var j  = 0; j < destLength; j++) returned[j] = dest[j];

  if (addedLength === 0) return returned;

  for (var i = 0; i < addedLength; i++) {
    var missing = true;
    for (j = 0; j < destLength; j++) {
      if (dest[j].uid === added[i].uid) {
        missing = false;
        break;
      }
    }
    if (missing) returned.push(added[i]);
  }

  return returned;
}
/**
 * The guts of the system -- called each time an asynchronous event happens
 * while one or more listeners are active.
 */
function asyncWrap(original, list, length) {
  var values = [];

  /*
   * listeners
   */
  inAsyncTick = true;
  for (var i = 0; i < length; ++i) {
    /* asyncListener.domain is the default value passed through before and
     * after if the listener doesn't return a value.
     */
    values[i] = list[i].domain;
    var value = list[i].listener.call(this);
    if (typeof value !== 'undefined') values[i] = value;
  }
  inAsyncTick = false;

  /* One of the main differences between this polyfill and the core
   * asyncListener support is that core avoids creating closures by putting a
   * lot of the state managemnt on the C++ side of Node (and of course also it
   * bakes support for async listeners into the Node C++ API through the
   * AsyncWrap class, which means that it doesn't monkeypatch basically every
   * async method like this does).
   */
  return function () {
    /*
     * before handlers
     */
    inAsyncTick = true;
    for (var i = 0; i < length; ++i) {
      var before = list[i].callbacks && list[i].callbacks.before;
      if (typeof before === 'function') before(this, values[i]);
    }
    inAsyncTick = false;

    // put the current values where the catcher can see them
    errorValues = values;

    /* More than one listener can end up inside these closures, so save the
     * current listeners on a stack.
     */
    listenerStack.push(listeners);

    /* Activate both the listeners that were active when the closure was
     * created and the listeners that were previously active.
     */
    listeners = union(list, length, listeners, listeners.length);

    // save the return value to pass to the after callbacks
    var returned = original.apply(this, arguments);

    // back to the previous listener list on the stack
    listeners = listenerStack.pop();
    errorValues = undefined;

    /*
     * after handlers (not run if original throws)
     */
    inAsyncTick = true;
    for (i = 0; i < length; ++i) {
      var after = list[i].callbacks && list[i].callbacks.after;
      if (typeof after === 'function') after(this, values[i], returned);
    }
    inAsyncTick = false;

    return returned;
  };
}

// for performance in the case where there are no handlers, just the listener
function simpleWrap(original, list, length) {
  inAsyncTick = true;
  for (var i = 0; i < length; ++i) list[i].listener();
  inAsyncTick = false;

  // still need to make sure nested async calls are made in the context
  // of the listeners active at their creation
  return function () {
    listenerStack.push(listeners);
    listeners = union(list, length, listeners, listeners.length);

    var returned = original.apply(this, arguments);

    listeners = listenerStack.pop();

    return returned;
  };
}

/**
 * Called each time an asynchronous function that's been monkeypatched in
 * index.js is called. If there are no listeners, return the function
 * unwrapped.  If there are any asyncListeners and any of them have callbacks,
 * pass them off to asyncWrap for later use, otherwise just call the listener.
 */
function wrapCallback(original) {
  var length = listeners.length;

  // no context to capture, so avoid closure creation
  if (length === 0) return original;

  // capture the active listeners as of when the wrapped function was called
  var list = listeners.slice();

  for (var i = 0; i < length; ++i) {
    if (list[i].callbacks) return asyncWrap(original, list, length);
  }

  return simpleWrap(original, list, length);
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
