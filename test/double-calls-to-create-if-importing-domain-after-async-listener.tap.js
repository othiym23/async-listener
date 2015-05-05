var test = require('tap').test;
if (!process.addAsyncListener) require('../index.js');
var domain = require('domain');

/**
 * if we import domains after async-listener, the domain import causes process.nextTick to call async listener twice.
 * The reason is because domain replaces the underlying _currentTickHandler. If domain is loaded after async listener,
 * the _currentTickHandler method is replaced with a wrapped method (wrapped by async listener).
 *
 * The net result is that
 * if we load async-listener, then domain, we will have both process.nextTick and _currentTickHandler wrapped.
 *
 * if we load domain, then async-listener, we will have only process.nextTick wrapped.
 *
 * This double wrapping causes another issue - if we have an exception in the async method, asycn-listener does not expect a method
 * to be wrapped twice and will only pop the listenerStack once, making calls after that that should not respond to the listener do be effected.
 *
 * **/
test("asyncListeners with domains", function (t) {
    t.plan(2);

    t.test("illustration of the problem - create is called twice", function(t) {
        t.plan(1);
        var callsToCreate = 0;
        var listener = process.createAsyncListener(
            {
                create : function () { callsToCreate++; },
                before : function () {},
                after  : function () {},
                error  : function () {}
            }
        );

        process.addAsyncListener(listener);
        process.nextTick(function Func() {
            t.equal(callsToCreate, 2, "number of calls to create");
        });
        process.removeAsyncListener(listener);


    });

    t.test("validate that async listener create is not called for a tick executed after a listened on tick with an error", function(t) {
        t.plan(2);
        var asyncListenedMethodDone = false;
        var callsToCreate = 0;
        var listener = process.createAsyncListener(
            {
                create : function () { callsToCreate++; },
                before : function () {},
                after  : function () {},
                error  : function () {return true;}
            }
        );

        process.addAsyncListener(listener);
        process.nextTick(function Func() {
            asyncListenedMethodDone = true;
            throw new Error("Bla");
        });
        process.removeAsyncListener(listener);

        // wait until the error was raised and then perform async operation
        var timer = setInterval(function() {
            if (asyncListenedMethodDone) {
                t.equal(callsToCreate, 2, "number of calls to create - before the async method");
                clearInterval(timer);
                process.nextTick(function() {
                    t.equal(callsToCreate, 2, "number of calls to create - in the async method (who should not be listened on by async the registered listener");
                })
            }
        }, 1);
    })
});
