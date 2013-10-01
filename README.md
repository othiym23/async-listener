# process.addAsyncListener polyfill

This is an implementation of Trevor Norris's
process.{addAsyncListener,removeAsyncListener} API for adding behavior to async
calls. You can see his implementation (currently a work in progress) on
[Node.js core pull request #5011](https://github.com/joyent/node/pull/6011).
This polyfill / shim is intended for use in versions of Node prior to whatever
version of Node in which Trevor's changes finally land (anticipated at the time of
this writing as 0.11.7).

Here's his documentation of the intended API, which will probably get cleaned up
here later:

```javascript
// Class that will store information about a specific request.
function Domain() { }

// This will be called every time asynchronous work is queued.
// The returned data will propagate to the callbackObject's callbacks.
// If no callbackObject is passed to asyncListener then the return value
// will be discarded.
function onAsync() {
  return new Domain();
}

// Set of methods that will run at specific points in time according to
// their cooresponding callbacks. These methods are always run FIFO if
// multiple are queued.
// "context" is the "this" of the request object.
var callbackObject = {
  before: function asyncBefore(context, domain) {
  },
  // "returnValue" is the value returned from the callback.
  after: function asyncAfter(context, domain, returnValue) {
  },
  // If this callback returns "true" then the error handler will assume
  // the error was properly handled, and process will continue normally.
  // If multiple error handlers are queued, and any one of those returns
  // true, then Node will assume the error was properly handled.
  // This will not currently be passed the context (or "this") of the
  // callback that threw. A simple way of achieving this is currently
  // being investigated, and the feature will be added when one is found.
  error: function asyncError(domain, err) {
  }
};

/**
 * process.addAsyncListener(callback[, object[, domain]]);
 *
 * Arguments:
 *
 * callback - Function that will be run when an asynchronous job is
 *    queued.
 *
 * object - Object with the optional callbacks set on:
 *    before - Callback called just before the asynchronous callback
 *        will be called.
 *    after - Callback called directly after the asynchronous callback.
 *    error - Callback called if there was an error.
 *
 * The returned key is an Object that serves as the unique key for the
 * call (much like how Timers work).
 */
var key = process.addAsyncListener(onAsync, callbackObject);


/**
 * process.createAsyncListener(callback[, object[, domain]]);
 *
 * Adding an async listener will immediately add it to the queue and
 * being listening for events. If you wish to create the listener in
 * advance, to say attach to the returned domain object, it's possible
 * to get the key and pass it to process.addAsyncListener() later.
 */
var key = process.createAsyncListener(onAsync, callbackObject, domain);

// Then activate like so:
process.addAsyncListener(key);


/**
 * process.removeAsyncListener(key);
 *
 * Remove any async listeners and associated callbackObjects. All
 * listeners will live independent of each other, and there will be no
 * method given to clear all async listeners.
 */
process.removeAsyncListener(key);
```
