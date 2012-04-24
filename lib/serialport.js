'use strict';

var SerialPortBinding = require("bindings")("serialport2.node");
var util = require('util');
var fs = require('fs');
var stream = require('stream');
var child_process = require('child_process');

function SerialPort () {
  stream.Stream.call(this);
}
util.inherits(SerialPort, stream.Stream);
exports.SerialPort = SerialPort;

SerialPort.prototype.open = function (path, options, callback) {
  var self = this;
  process.nextTick(function () {
    options.baudRate = options.baudRate || 9600;
    options.dataBits = options.dataBits || 8;
    options.parity = options.parity || 'none';
    options.stopBits = options.stopBits || 1;
    options.bufferSize = options.bufferSize || 100;
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

      if (process.platform != 'win32') {
        self.readStream = fs.createReadStream(self.fd, { bufferSize: options.bufferSize });
        self.readStream.on("open", function () {
          self.emit('open');
        });
        self.readStream.on("data", options.dataCallback);
        self.readStream.on("error", function (err) {
          self.emit('error', err);
        });
        self.readStream.on("close", function () {
          self.emit('close');
        });
        self.readStream.on("end", function () {
          self.emit('end');
        });
      }

      self.emit('open');
    });
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

SerialPort.prototype.close = function (callback) {
  var self = this;
  SerialPortBinding.close(this.fd, function (err) {
    if (err) {
      self.emit('error', err);
    }
    if (callback) {
      callback(err);
    }
    self.emit('close');
  });
};

exports.list = function (callback) {
  if (process.platform == 'win32') {
    SerialPortBinding.list(callback);
  } else {
    throw new Error("Not supported");
  }
};
