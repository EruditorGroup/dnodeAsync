"use strict";
var assert = require("assert");
var Promise = require("bluebird");
var dnode = require('dnode');
var dnodeAsync = require("../index.js");

var address = {
  host: 'localhost',
  port: 1111
}

var server;
var failTimes=3;
var callsCount=0;
var data = 0;

describe("main", function () {

  before(function () {
    //console.log("start dnode server");
    server = dnode({

      getData : function (a, b, callback) {
        return callback(null, a*b)
      },

      getDataRetry : function (a, b, callback) {
        callsCount++;
        if(callsCount <= failTimes) {
          return callback(new Error("force retry"));
        }
        return callback(null, a*b);
      }

    });
    server.listen(address.port);
  });

  it("test", function () {
    data = 0;
    var opts = {uri: address};
    var d = dnodeAsync(opts);
    var ready = Promise.using(d, function(remote){
      //console.log('remote');
      return remote
        .getDataAsync(3,4)
        .tap(function(result){
          data = result;
          //console.log("data", data);
          assert(data===12);
        });
    });

    return ready.tap(function(){
      //console.log("ready");
      assert(data===12);
    });
  });

  it("retry", function () {
    data = 0;
    var opts = {
      uri: address,
      retries: 5,
      retryDelay: 100
    };
    var ready = dnodeAsync.dnodeAsyncCall(opts, 'getDataRetry', [3, 4])
    .tap(function (result) {
      //console.log("data", data);
      data = result;
      assert(data===12);
    });

    var delay = Promise
      .delay(opts.retryDelay * failTimes)
      .return(1);

    return ready
      .catch(function(err) {
        console.error("err", err);
      })
      .tap(function() {
        //console.log("ready");
        assert.equal(data, 12);
        assert(callsCount === failTimes + 1);
        assert(delay.value());
      });
  });

  after(function(){
    server.end();
  })

});
