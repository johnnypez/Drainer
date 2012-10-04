// a quick and dirty cube client

var dgram = require('dgram');

var udp = dgram.createSocket("udp4");

exports.collect = function(data){
  var buffer = Buffer(JSON.stringify(data));
  udp.send(buffer, 0, buffer.length, 1180, "127.0.0.1");
}

