"use strict";
// This module implements the process.addAsyncListener API as proposed for
// node.js v0.12.x It's exported as an eventSource hook (a callback wrapper).

if (process.addAsyncListener) {
  throw new Error("Don't require async-listener polyfill unless needed");
}

var listeners = [];

function runSetup(list, length) {
  var data = new Array(length), i, listener;
  for (i = 0; i < length; ++i) {
    listener = list[i];
    data[i] = listener.onAsync();
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

function addAsyncListener(onAsync, callbackObject) {
  var listener = {
    onAsync        : onAsync,
    callbackObject : callbackObject
  };

  listeners.push(listener);

  return listener;
}

function removeAsyncListener(onAsync) {
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

module.exports = wrapCallback;
