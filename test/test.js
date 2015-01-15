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
var data = 0;

describe("main", function () {

  beforeEach(function (done) {
    //console.log("start dnode server");
    server = dnode({
      getData : function (a, b, callback) {
        return callback(null, a*b)
      }
    });
    server.listen(address.port);
    done();
  });

  it("test", function (done) {
    var opts = {uri: address};
    var ready = Promise.using(dnodeAsync(opts), function(remote){
      return remote
        .getDataAsync(3,4)
        .tap(function(result){
          data = result;
          //console.log("data", data);
          assert(data===12);
        });
    });

    ready.tap(function(){
      //console.log("ready");
      assert(data===12)
      done();
    });

  });

  afterEach(function(done){
    server.end();
    done();
  })

});
