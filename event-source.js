"use strict";
// This module wraps as many event sources in node.js  as possible by monkey-
// patching externally. It exports a function that accepts a callback-transform
// function to be applied to every event source.

var wrappers = [];
function wrapCallback(callback) {
  for (var i = wrappers.length - 1; i >= 0; --i) {
    callback = wrappers[i](callback);
  }
  return callback;
}

var patched = false;
module.exports = function (wrapper) {
  wrappers.push(wrapper);
  if (patched) return;
  patched = true;

  var shimmer = require('shimmer');
  var wrap = shimmer.wrap;
  var massWrap = shimmer.massWrap

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

};
