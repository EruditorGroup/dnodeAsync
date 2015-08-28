"use strict";
var dnode = require('dnode');
var net = require('net');
var Promise = require('bluebird');

var makePromise = Promise.method(function (context, opts) {
  return new Promise(function(resolve, reject) {
    //console.log("new Promise");

    var _opts = context.opts = opts || {};
    var options = _opts.options || {};
    options.weak = options.weak || false;

    var d = dnode(undefined, options);
    context.connection = net.connect(_opts.uri);
    context.connection.pipe(d).pipe(context.connection);

    context.connection.once('error', reject);
    d.once('remote', function (remote) {
      context.remote = Promise.promisifyAll(remote);
      resolve(remote);
    });
    d.once('error', reject);
  })
  .timeout(opts.timeout || 100)
  .catch(function(err) {
    err.address = opts.uri;
    throw err;
  });

});

var makeDisposerFunction = function (context) {
  return function () {
    //console.log("disposer", Object.keys(context));

    if (context.connection.destroyed) { return; }

    return new Promise(function (resolve) {
      context.connection.once('close', resolve);
      context.connection.end();
      context.connection.unref();
      // Нет нужды слушать 'error', т.к. 'close' вызывается сразу после возникновения ошибки
      // https://nodejs.org/docs/latest/api/net.html#net_event_error_1
    });
  };
};

function dnodeAsync(opts) {
  var context = {};
  return makePromise(context, opts)
    .disposer(makeDisposerFunction(context));
}

function dnodeAsyncCall(opts, _methodName, args, retries) {
  if(!_methodName || typeof(_methodName) !== 'string'){
    throw new Error("empty method name");
  }

  if(!Array.isArray(args || [])){
    throw new Error("args must be array");
  }

  var methodName = '' + _methodName + 'Async';
  if(typeof(retries) === 'undefined') { retries = opts.retries || 0; }

  //console.log('dnodeAsyncCall', opts, retries);

  return Promise.using(
    dnodeAsync(opts),
    function (remote) {
      var method = remote[methodName];
      if(!method || typeof(method) !== 'function'){
        throw new Error("remote method not found", method);
      }
      return method.apply(remote, args);
    })
    .catch(function (err) {
      if(!retries) { throw err; }
      return Promise
        .delay(opts.retryDelay || 10)
        .then(function () {
          return dnodeAsyncCall(opts, _methodName, args, retries-1);
        });
    });

}
dnodeAsync.dnodeAsyncCall = dnodeAsyncCall;

module.exports = dnodeAsync;
