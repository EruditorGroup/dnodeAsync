"use strict";
var dnode = require('dnode');
var domain = require('domain');
var Promise = require('bluebird');

module.exports = function(opts) {
  var connection;
  return new Promise(function(resolve, reject) {
    var safe, isStop = false;
    safe = domain.create();
    safe.on('error', function(e) {
      connection = undefined;
      isStop = true;
      reject(e);
    });
    return safe.run(function() {
      var d = dnode(undefined, opts.options);
      connection = d.connect(opts.uri);
      connection.on('error', function(e) {
        reject(e);
        if (!isStop) {
          connection.end();
          connection = undefined;
          isStop = true;
        }
      });
      return connection.on('remote', function(remote) {
        return resolve(Promise.promisifyAll(remote));
      });
    });
  })
  .timeout(opts.timeout || 100)
  .catch(function(err) {
    err.address = opts.uri;
    throw err;
  })
  .disposer(function() {
    if (connection) {
      return connection.end();
    }
  });
};

