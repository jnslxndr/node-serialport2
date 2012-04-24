// Test with the epic VirtualSerialPortApp - http://code.google.com/p/macosxvirtualserialport/

var SerialPort = require('../').SerialPort;
var assert = require('assert');

var keepAlive = setTimeout(function () {console.log('timeout');}, 10000);

var readData = '';
var sp = new SerialPort();
sp.on('data', function (data) {
  readData += data.toString();
  console.log('read buffer:', readData);
  if (readData === 'READY') {
    readData = '';
    sp.write("hello world", function (err, bytesWritten) {
      console.log('bytes written:', bytesWritten);
    });
  }
  if (readData === "HELLO WORLD") {
    sp.close();
    clearTimeout(keepAlive);
    console.log('done');
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
