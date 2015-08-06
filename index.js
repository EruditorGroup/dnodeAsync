"use strict";
var dnode = require('dnode');
var net = require('net');
var Promise = require('bluebird');

module.exports = function(opts) {
  var connection;
  return new Promise(function(resolve, reject) {
    var _opts = opts || {};
    var options = _opts.options || {};
    options.weak = options.weak || false;

    var d = dnode(undefined, options);
    connection = net.connect(_opts.uri);
    connection.pipe(d).pipe(connection);

    connection.once('error', reject);
    d.once('remote', function (remote) {
        resolve(Promise.promisifyAll(remote));
    });
    d.once('error', reject);
  })
  .timeout(opts.timeout || 100)
  .catch(function(err) {
    err.address = opts.uri;
    throw err;
  })
  .disposer(function() {
      return new Promise(function (resolve, reject) {
         connection.end();
         connection.unref();
         connection.once('close', resolve);
         // Нет нужды слушать 'error', т.к. 'close' вызывается сразу после возникновения ошибки
         // https://nodejs.org/docs/latest/api/net.html#net_event_error_1
      });
  });
};
