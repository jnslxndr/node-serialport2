'use strict';

var SerialPortBinding = require("bindings")("serialport2.node");
var util = require('util');
var fs = require('fs');
var stream = require('stream');
var path = require('path');
var async = require('async');

function SerialPort () {
  stream.Stream.call(this);
}
util.inherits(SerialPort, stream.Stream);
exports.SerialPort = SerialPort;

SerialPort.prototype.open = function (path, options, callback) {
  var self = this;
  process.nextTick(function () {
    options = options || {};
    options.baudRate = options.baudRate || 9600;
    options.dataBits = options.dataBits || 8;
    options.parity = options.parity || 'none';
    options.stopBits = options.stopBits || 1;
    if (!('flowControl' in options)) {
      options.flowControl = false;
    }
    options.bufferSize = options.bufferSize || 100;
    options.dataCallback = function (data) {
      self.emit('data', data);
    };
    options.errorCallback = function (err) {
      self.emit('error', err);
    };
    options.disconnectedCallback = function () {
      self.emit('error', new Error("Disconnected"));
      self.close();
    };

    if (process.platform != 'win32') {
      self.readStream = fs.createReadStream(path, { bufferSize: options.bufferSize });
      self.readStream.on("data", options.dataCallback);
      self.readStream.on("error", options.errorCallback);
      self.readStream.on("close", function () {
        self.close();
      });
      self.readStream.on("end", function () {
        self.emit('end');
      });
    }

    SerialPortBinding.open(path, options, function (err, fd) {
      self.fd = fd;
      if (callback) {
        callback(err);
      }
      if (err) {
        return self.emit('error', err);
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

  if (self.readStream) {
    self.readStream.destroy();
  }

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

function listUnix (callback) {
  fs.readdir("/dev/serial/by-id", function (err, files) {
    if (err) {
      // if this directory is not found this could just be because it's not plugged in
      if (err.errno === 34) {
        callback(null, []);
      }
      return console.log(err);
    }

    async.map(files, function (file, callback) {
      var fileName = path.join("/dev/serial/by-id", file);
      fs.readlink(fileName, function (err, link) {
        if (err) {
          return callback(err);
        }
        link = path.resolve(fileName, link);
        callback(null, {
          comName: link,
          manufacturer: undefined,
          pnpId: file
        });
      });
    }, callback);
  });
}

exports.list = function (callback) {
  if (process.platform == 'win32') {
    SerialPortBinding.list(callback);
  } else {
    listUnix(callback);
  }
};
