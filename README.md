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
// The context (i.e. "this") of the calling method will be passed as the
// first argument.
function onAsync(context) {
  return new Domain();
}

// Set of methods that will run at specific points in time according to
// their cooresponding callbacks. These methods are always run FIFO if
// multiple are queued.
var callbackObject = {
  before: function asyncBefore(domain) {
  },
  after: function asyncAfter(domain) {
  },
  // If this callback returns "true" then the error handler will assume
  // the error was properly handled, and process will continue normally.
  // If multiple error handlers are queued, and any one of those returns
  // true, then Node will assume the error was properly handled.
  error: function asyncError(err, domain) {
  },
  // Useful to cleanup any resources.
  done: function asyncDone(domain) {
  }
};

/**
 * process.addAsyncListener([callback][, object]);
 *
 * Arguments:
 *
 * callback - Function that will be run when an asynchronous job is
 *    queued. The "context" argument is the "this" of the function
 *    where the callback is being queued (e.g. EventEmitter instance).
 *    Though this will not do much for callbacks passed to
 *    process.nextTick(), since there's no associated context.
 *
 * object - Object with the optional callbacks set on:
 *    before - Callback called just before the asynchronous callback
 *        will be called. Passed will be any data that was returned
 *        from the associated callback event. If no callback was
 *        passed, then no data is sent.
 *    after - Callback called directly after the asynchronous callback.
 *        Also passed is the data returned from the corresponding
 *        callback event.
 *    error - Callback called if there was an error. Arguments are the
 *        Error object, and data.
 *    done - Called when no other possible asynchronous callbacks could
 *        be queued.
 *
 * The returned key is an Object that serves as the unique key for the
 * call (much like how Timers work).
 */
var key = process.addAsyncListener(onAsync, callbackObject);


/**
 * process.removeAsyncListener(key);
 *
 * Remove any async listeners and associated callbackObjects. All
 * listeners will live independent of each other, and there will be no
 * method given to clear all async listeners.
 */
process.removeAsyncListener(key);
```
