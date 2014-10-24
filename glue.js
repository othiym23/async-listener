var wrap = require('shimmer').wrap;
/*
 *
 * CONSTANTS
 *
 */
var HAS_CREATE_AL = 1 << 0;
var HAS_BEFORE_AL = 1 << 1;
var HAS_AFTER_AL = 1 << 2;
var HAS_ERROR_AL = 1 << 3;

/**
 * There is one list of currently active listeners that is mutated in place by
 * addAsyncListener and removeAsyncListener. This complicates error-handling,
 * for reasons that are discussed below. Currently active listeners are the set
 * of listeners that will wrap NEW async context created.
 */
var listeners = null;

/**
 * Error Listeners are the set of listeners that were present when the current
 * async context was CREATED.  This list is set before any async callback is run
 * and is reset to any empty list after the callback has finished. It is reset
 * to an empty list in case an unwrapped callback is triggered, it is important
 * not to cary over any error listeners from a different context
 */
var errorListeners = [];

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
 * This will pass Uncaught exceptions to the list of active error listeners.
 * These handlers MAY indicate that they have handled the exceptio. If the
 * exception is not handled by any of the listeners, the error will be rethrown
 */
var asyncCatcher;

/**
 * The guts of the system -- called each time an asynchronous event happens
 * while one or more listeners are active.
 */
var asyncWrap;

/**
 * For performance, split error-handlers and asyncCatcher up into two separate
 * code paths.
 */

// 0.9+
if (process._fatalException) {
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

  asyncCatcher = function asyncCatcher(er) {
    var length = errorListeners.length;
    if (inErrorTick || length === 0) return false;

    var handled = false;

    /**
     * error handlers
     */
    inErrorTick = true;
    for (var i = 0; i < length; ++i) {
      var listener = errorListeners[i];
      if ((listener.flags & HAS_ERROR_AL) === 0) continue;

      var value = errorValues && errorValues[listener.uid];
      handled = listener.error(value, er) || handled;
    }
    inErrorTick = false;

    /**
     * Reset listers errorListeners andError values, there may not be a chance
     * to modify these immediately before entering an unwrapped async context
     */
    listeners = null;
    errorListeners = [];
    errorValues = undefined;

    return handled && !inAsyncTick;
  };


  /**
   * asyncWrap receives the set of listeners that were active when the async
   * method was first called. This list is kept in scope ussing a closure around
   * the callback wrapper.  This list is then used as a base for adding and
   * removing listeners in the callback.  Adding and Removing listeners will
   * only affect new async context created in that callback.
   */
  asyncWrap = function asyncWrap(original, list, length) {
    var values = [];

    /*
     * listeners
     */
    inAsyncTick = true;
    for (var i = 0; i < length; ++i) {
      var listener = list[i];
      values[listener.uid] = listener.data;

      if ((listener.flags & HAS_CREATE_AL) === 0) continue;

      var value = listener.create(listener.data);
      if (value !== undefined) values[listener.uid] = value;
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
      // put the current values and listeners where the catcher can see them
      errorValues = values;
      errorListeners = list;

      /* Don't modify the set of listeners that is used for before after and
       * error callbacks for the current context when adding or removing
       * listeners
       * current listeners on a stack.
       */
      listeners = list.slice();

      /*
       * before handlers
       */
      inAsyncTick = true;
      for (var i = 0; i < length; ++i) {
        if ((list[i].flags & HAS_BEFORE_AL) > 0) {
          list[i].before(this, values[list[i].uid]);
        }
      }
      inAsyncTick = false;

      // save the return value to pass to the after callbacks
      var returned = original.apply(this, arguments);

      /*
       * after handlers (not run if original throws)
       */
      inAsyncTick = true;
      for (i = 0; i < length; ++i) {
        if ((list[i].flags & HAS_AFTER_AL) > 0) {
          list[i].after(this, values[list[i].uid]);
        }
      }
      inAsyncTick = false;

      /**
       * Reset listers errorListeners andError values, there may not be a chance
       * to modify these immediately before entering an unwrapped async context
       */
      listeners = null;
      errorListeners = [];
      errorValues = undefined;

      return returned;
    };
  };

  wrap(process, '_fatalException', function (_fatalException) {
    return function _asyncFatalException(er) {
      return asyncCatcher(er) || _fatalException(er);
    };
  });
}
// 0.8 and below
else {
  asyncWrap = function asyncWrap(original, list, length) {
    var values = [];

    /*
     * listeners
     */
    inAsyncTick = true;
    for (var i = 0; i < length; ++i) {
      var listener = list[i];
      values[listener.uid] = listener.data;

      if ((listener.flags & HAS_CREATE_AL) === 0) continue;

      var value = listener.create(listener.data);
      if (value !== undefined) values[listener.uid] = value;
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
      /*jshint maxdepth:4*/

      // after() handlers don't run if threw
      var threw = false;

      // ...unless the error is handled
      var handled = false;

      /* Don't modify the set of listeners that is used for before after and
       * error callbacks for the current context when adding or removing
       * listeners
       * current listeners on a stack.
       */
      listeners = list.slice();

      /*
       * before handlers
       */
      inAsyncTick = true;
      for (var i = 0; i < length; ++i) {
        if ((list[i].flags & HAS_BEFORE_AL) > 0) {
          list[i].before(this, values[list[i].uid]);
        }
      }
      inAsyncTick = false;

      // save the return value to pass to the after callbacks
      var returned;
      try {
        returned = original.apply(this, arguments);
      }
      catch (er) {
        threw = true;
        for (var i = 0; i < length; ++i) {
          if ((list[i].flags & HAS_ERROR_AL) > 0) continue;
          handled = list[i].error(values[list[i].uid], er) || handled;
        }

        throw er;
      }
      finally {
        /*
         * after handlers (not run if original throws)
         */
        if (!threw || handled) {
          inAsyncTick = true;
          for (i = 0; i < length; ++i) {
            if ((list[i].flags & HAS_AFTER_AL) > 0) {
              list[i].after(this, values[list[i].uid]);
            }
          }
          inAsyncTick = false;
        }

        // reset listeners for any unwrapped async call
        listeners = null;
      }

      return returned;
    };
  };
}

// for performance in the case where there are no handlers, just the listener
function simpleWrap(original, list, length) {
  inAsyncTick = true;
  for (var i = 0; i < length; ++i) {
    var listener = list[i];
    if (listener.create) listener.create(listener.data);
  }
  inAsyncTick = false;

  // still need to make sure nested async calls are made in the context
  // of the listeners active at their creation
  return function () {
    /**
     * no need to copy list here since its already a copy and there are no
     * errorListeners to set
     */
    listeners = list;

    var returned = original.apply(this, arguments);

    listeners = null;

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
  var length = listeners ? listeners.length : 0;

  // no context to capture, so avoid closure creation
  if (length === 0) return original;

  // capture the active listeners as of when the wrapped function was called
  var list = listeners.slice();

  for (var i = 0; i < length; ++i) {
    if (list[i].flags > 1) return asyncWrap(original, list, length);
  }

  return simpleWrap(original, list, length);
}

function AsyncListener(callbacks, data) {
  if (typeof callbacks.create === 'function') {
    this.create = callbacks.create;
    this.flags |= HAS_CREATE_AL;
  }

  if (typeof callbacks.before === 'function') {
    this.before = callbacks.before;
    this.flags |= HAS_BEFORE_AL;
  }

  if (typeof callbacks.after === 'function') {
    this.after = callbacks.after;
    this.flags |= HAS_AFTER_AL;
  }

  if (typeof callbacks.error === 'function') {
    this.error = callbacks.error;
    this.flags |= HAS_ERROR_AL;
  }

  this.uid = ++uid;
  this.data = data === undefined ? null : data;
}
AsyncListener.prototype.create = undefined;
AsyncListener.prototype.before = undefined;
AsyncListener.prototype.after  = undefined;
AsyncListener.prototype.error  = undefined;
AsyncListener.prototype.data   = undefined;
AsyncListener.prototype.uid    = 0;
AsyncListener.prototype.flags  = 0;

function createAsyncListener(callbacks, data) {
  if (typeof callbacks !== 'object' || !callbacks) {
    throw new TypeError('callbacks argument must be an object');
  }

  if (callbacks instanceof AsyncListener) {
    return callbacks;
  }
  else {
    return new AsyncListener(callbacks, data);
  }
}

function addAsyncListener(callbacks, data) {
  var listener;
  if (!(callbacks instanceof AsyncListener)) {
    listener = createAsyncListener(callbacks, data);
  }
  else {
    listener = callbacks;
  }

  if(!listeners) {
    /**
     * we are not in a wrapped context so listeners will not be reset for us
     */
    process.nextTick(function() {
      listeners = null;
    })
    listeners = [listener]
    return listener
  }

  // Make sure the listener isn't already in the list.
  var registered = false;
  for (var i = 0; i < listeners.length; i++) {
    if (listener === listeners[i]) {
      registered = true;
      break;
    }
  }

  if (!registered) listeners.push(listener);

  return listener;
}

function removeAsyncListener(listener) {
  if(!listeners) return;
  for (var i = 0; i < listeners.length; i++) {
    if (listener === listeners[i]) {
      listeners.splice(i, 1);
      break;
    }
  }
}

process.createAsyncListener = createAsyncListener;
process.addAsyncListener    = addAsyncListener;
process.removeAsyncListener = removeAsyncListener;

module.exports = wrapCallback;
