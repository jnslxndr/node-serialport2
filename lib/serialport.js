'use strict';

var SerialPortBinding = require("bindings")("serialport2.node");
var util = require('util');
var events = require("events");

function SerialPort () {
}
util.inherits(SerialPort, events.EventEmitter);
exports.SerialPort = SerialPort;

SerialPort.prototype.open = function (path, options, callback) {
  var self = this;
  options.baudRate = options.baudRate || 9600;
  options.dataBits = options.dataBits || 8;
  options.parity = options.parity || 'none';
  options.stopBits = options.stopBits || 1;
  if (process.platform === 'win32') {
    options.dataCallback = function (data) {
      self.emit('data', data);
    }
  }

  SerialPortBinding.open(path, options, function (err, fd) {
    self.fd = fd;
    if (callback) {
      callback(err);
    }
    if (err) {
      return self.emit('error', err);
    }
    self.emit('connect');
  });
};

SerialPort.prototype.write = function (buffer, callback) {
  var self = this;
  if (!Buffer.isBuffer(buffer)) {
    buffer = new Buffer(buffer);
  }
  SerialPortBinding.write(this.fd, buffer, function (err, results) {
    if (err) {
      self.emit('error', err);
    }
    if (callback) {
      callback(err, results);
    }
  });
};
