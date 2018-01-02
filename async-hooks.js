'use strict';
// in this file, we can safely assume we are running in node 8+
const asyncHook = require('async_hooks');
const shimmer   = require('shimmer');

const CURRENT_LISTENER = Symbol();
process[CURRENT_LISTENER] = process[CURRENT_LISTENER] || null;

const LISTENER_MAP = new Map();

process.on('uncaughtException', (err) => {

    const current = process[CURRENT_LISTENER];
    if (current !== null && typeof current.error === 'function') {
        if (current.error({}, err)) { // TODO: get storage
            return;
        }
    }
    throw err;
});

shimmer.wrap(process, 'addAsyncListener', (addAsyncListener) => {

    return function () {

        const listener = addAsyncListener.apply(this, arguments);

        listener.pairing = new Map();
        listener.realm = new Set();
        listener.hook = asyncHook.createHook({
            init(asyncId) {
                const value = listener.create(listener.data) || listener.data;
                listener.pairing.set(asyncId, value);
                listener.realm.add(asyncId);
            },
            before(asyncId) {

                if (!listener.realm.has(asyncId)) return;

                const value = listener.pairing.get(asyncId);
                listener.before && listener.before(null, value); // TODO: fix context?
                if (process[CURRENT_LISTENER] !== null) {
                    LISTENER_MAP.set(asyncId, process[CURRENT_LISTENER]);
                }
                process[CURRENT_LISTENER] = listener;
            },
            after(asyncId) {

                if (!listener.realm.has(asyncId)) return;


                if (LISTENER_MAP.has(asyncId)) {
                    process[CURRENT_LISTENER] = LISTENER_MAP.get(asyncId);
                }
                else {
                    process[CURRENT_LISTENER] = null;
                }
                const value = listener.pairing.get(asyncId);
                listener.after && listener.after(null, value); // TODO: fix context?
            },
            destroy(asyncId) {
                listener.pairing.delete(asyncId);
                listener.realm.delete(asyncId);
            }
        });
        listener.hook.enable();

        return listener;
    }
});

shimmer.wrap(process, 'removeAsyncListener', (removeAsyncListener) => {

    return function (listener) {
        if (listener.hook) {
            listener.hook.disable(); // TODO;
        }
        removeAsyncListener(listener);
    }
});
