// Test with the epic VirtualSerialPortApp - http://code.google.com/p/macosxvirtualserialport/

var SerialPort = require('../').SerialPort;
var assert = require('assert');

var keepAlive = setTimeout(function () {
  console.log('timeout');
  process.exit();
}, 10000);

var portName = (process.platform == 'win32') ? 'COM4' : '/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_A800eFN5-if00-port0';

var readData = '';
var sp = new SerialPort();
sp.on('data', function (data) {
  readData += data.toString();
  console.log('read buffer:', readData);
  if (readData.indexOf('READY') >= 0) {
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

sp.on('close', function (err) {
  console.log('port closed');
});

sp.on('error', function (err) {
  throw err;
});

sp.on('open', function() {
  console.log('port opened... Press reset on the Arduino.');
  //sp.toggleDTR();
});

sp.open(portName, {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false
});
