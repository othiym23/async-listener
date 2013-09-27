var listeners = [];

function runSetup(list, length) {
  var data = new Array(length);
  for (var i = 0; i < length; ++i) {
    var bundle = list[i];
    data[i] = bundle.listener.call(this);
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

function runError(data, list, length, error) {
  for (var i = 0; i < length; ++i) {
    var callbacks = list[i].callbacks;
    if (callbacks && callbacks.error) callbacks.error(data[i], error);
  }
}

function catchyWrap(original, list, length) {
  var data = runSetup(list, length);
  return function () {
    runBefore(data, list, length, this);
    try {
      return original.apply(this, arguments);
    }
    catch (error) {
      runError(data, list, length, error);
    }
    finally {
      runAfter(data, list, length, this);
    }
  };
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
  var list = Array.prototype.slice.call(listeners);
  var length = list.length;
  var hasAny = false, hasErr = false;
  for (var i = 0; i < length; ++i) {
    var callbacks = list[i].callbacks;
    if (callbacks) {
      hasAny = true;
      if (callbacks.error) hasErr = true;
    }
  }
  return hasAny ? hasErr ? catchyWrap(original, list, length)
                         : normalWrap(original, list, length)
                : noWrap(original, list, length);
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
