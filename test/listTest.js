// Test with the epic VirtualSerialPortApp - http://code.google.com/p/macosxvirtualserialport/

var serialport = require('../');
var assert = require('assert');

serialport.list(function (err, results) {
  if (err) {
    throw err;
  }
  for (var i = 0; i < results.length; i++) {
    var item = results[i];
    console.log(item.comName, '-', item.manufacturer, '-', item.pnpId);
  }
});
