'use strict';

if (process.addAsyncListener) throw new Error("Don't require polyfill unless needed");

var shimmer        = require('shimmer')
  , wrap           = shimmer.wrap
  , massWrap       = shimmer.massWrap
  , glue           = require('./glue.js')
  , wrapCallback   = glue.wrapCallback
  , activator      = glue.activator
  , activatorFirst = glue.activatorFirst
  ;

var net = require('net');
wrap(net.Server.prototype, '_listen2', function (original) {
  return function () {
    this.on('connection', function (socket) {
      socket._handle.onread = wrapCallback(socket._handle.onread);
    });
    var result = original.apply(this, arguments);
    this._handle.onconnection = wrapCallback(this._handle.onconnection);
    return result;
  };
});

wrap(net.Socket.prototype, 'connect', function (original) {
  return function () {
    var args = net._normalizeConnectArgs(arguments);
    if (args[1]) args[1] = wrapCallback(args[1]);
    var result = original.apply(this, args);
    this._handle.onread = wrapCallback(this._handle.onread);
    return result;
  };
});

var processors = ['nextTick'];
if (process._nextDomainTick) processors.push('_nextDomainTick');
if (process._tickDomainCallback) processors.push('_tickDomainCallback');

massWrap(
  process,
  processors,
  activator
);

var asynchronizers = [
  'setTimeout',
  'setInterval'
];
if (global.setImmediate) asynchronizers.push('setImmediate');

massWrap(
  [global, require('timers')],
  asynchronizers,
  activatorFirst
);

var dns = require('dns');
massWrap(
  dns,
  [
    'lookup',
    'resolve',
    'resolve4',
    'resolve6',
    'resolveCname',
    'resolveMx',
    'resolveNs',
    'resolveTxt',
    'resolveSrv',
    'reverse'
  ],
  activator
);

if (dns.resolveNaptr) wrap(dns, 'resolveNaptr', activator);

var fs = require('fs');
massWrap(
  fs,
  [
    'watch',
    'rename',
    'truncate',
    'chown',
    'fchown',
    'chmod',
    'fchmod',
    'stat',
    'lstat',
    'fstat',
    'link',
    'symlink',
    'readlink',
    'realpath',
    'unlink',
    'rmdir',
    'mkdir',
    'readdir',
    'close',
    'open',
    'utimes',
    'futimes',
    'fsync',
    'write',
    'read',
    'readFile',
    'writeFile',
    'appendFile',
    'watchFile',
    'unwatchFile',
    "exists",
  ],
  activator
);

// only wrap lchown and lchmod on systems that have them.
if (fs.lchown) wrap(fs, 'lchown', activator);
if (fs.lchmod) wrap(fs, 'lchmod', activator);

// only wrap ftruncate in versions of node that have it
if (fs.ftruncate) wrap(fs, 'ftruncate', activator);

// Wrap zlib streams
var zProto = Object.getPrototypeOf(require('zlib').Deflate.prototype);
wrap(zProto, "_transform", activator);

// Wrap Crypto
var crypto;
try { crypto = require('crypto'); } catch (err) { }
if (crypto) {
  massWrap(
    crypto,
    [
      'pbkdf2',
      'randomBytes',
      'pseudoRandomBytes',
    ],
    activator
  );
}
