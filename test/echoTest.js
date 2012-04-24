// Test with the epic VirtualSerialPortApp - http://code.google.com/p/macosxvirtualserialport/

var SerialPort = require('../').SerialPort;
var assert = require('assert');

var sp = new SerialPort();
var readData = '';
sp.on('data', function (data) {
  readData += data.toString();
  console.log(readData);
  if(readData === 'READY') {
    readData = '';
    sp.write("hello world", function (err, bytesWritten) {
      console.log('bytes written:', bytesWritten);
    });
  }
  if (readData === "HELLO WORLD") {
    sp.close();
  }
});
sp.on('error', function (err) {
  throw err;
});
sp.open("COM4", {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1
});

setTimeout(function () {console.log('done');}, 100000);
