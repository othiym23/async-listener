'use strict';

var listeners = [];

function runSetup(list, length) {
  var data = new Array(length), i, listener;
  for (i = 0; i < length; ++i) {
    listener = list[i];
    data[i] = listener.onAsync.call(this);
  }
  return data;
}

function runBefore(data, list, length) {
  var i, obj;
  for (i = 0; i < length; ++i) {
    obj = list[i].callbackObject;
    if (obj && obj.before) obj.before(data[i]);
  }
}

function runAfter(data, list, length) {
  var i, obj;
  for (i = 0; i < length; ++i) {
    obj = list[i].callbackObject;
    if (obj && obj.after) obj.after(data[i]);
  }
  for (i = 0; i < length; ++i) {
    obj = list[i].callbackObject;
    if (obj && obj.done) obj.done(data[i]);
  }
}

function runError(data, list, length) {
  var i, obj;
  for (i = 0; i < length; ++i) {
    obj = list[i].callbackObject;
    if (obj && obj.after) obj.after(data[i]);
  }
}

function catchyWrap(original, list, length) {
  var data = runSetup(list, length);
  return function () {
    runBefore(data, list, length);
    try {
      return original.apply(this, arguments);
    }
    catch (err) {
      runError(data, list, length);
    }
    finally {
      runAfter(data, list, length);
    }
  };
}

function normalWrap(original, list, length) {
  var data = runSetup(list, length);
  return function () {
    runBefore(data, list, length);
    try {
      return original.apply(this, arguments);
    }
    finally {
      runAfter(data, list, length);
    }
  };
}

function noWrap(original, list, length) {
  for (var i = 0; i < length; ++i) list[i].onAsync();
  return original;
}

function wrapCallback(original) {
  var list = Array.prototype.slice.call(listeners);
  var length = list.length;
  var hasAny = false, hasErr = false;
  for (var i = 0; i < length; ++i) {
    var obj = list[i].callbackObject;
    if (obj) {
      hasAny = true;
      if (obj.error) hasErr = true;
    }
  }
  return hasAny ? hasErr ? catchyWrap(original, list, length)
                         : normalWrap(original, list, length)
                : noWrap(original, list, length);
}

// Shim activator for functions that have callback last
function activator(fn) {
  return function () {
    var index = arguments.length - 1;
    if (typeof arguments[index] === "function") {
      arguments[index] = wrapCallback(arguments[index]);
    }
    return fn.apply(this, arguments);
  };
}

// Shim activator for functions that have callback first
function activatorFirst(fn) {
  return function () {
    if (typeof arguments[0] === "function") {
      arguments[0] = wrapCallback(arguments[0]);
    }
    return fn.apply(this, arguments);
  };
}

function addAsyncListener(onAsync, callbackObject) {
  var listener = {
    onAsync        : onAsync,
    callbackObject : callbackObject
  };

  listeners.push(listener);

  return listener.onAsync;
}

function removeAsyncListener(onAsync) {
  if (!onAsync) throw new Error("must pass listener to remove");
  var index = -1;
  for (var i = 0; i < listeners.length; i++) {
    if (listeners[i].onAsync === onAsync) {
      index = i;
      break;
    }
  }
  if (index < 0) throw new Error("async listener not found");

  listeners.splice(index, 1);
}

process.addAsyncListener    = addAsyncListener;
process.removeAsyncListener = removeAsyncListener;

module.exports = {
  wrapCallback   : wrapCallback,
  activator      : activator,
  activatorFirst : activatorFirst
};
