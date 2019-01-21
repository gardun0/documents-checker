"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.gmToBuffer = exports.errorResponse = exports.successResponse = exports.optionalProperty = void 0;

var _ramda = require("ramda");

/**
 * GENERAL HELPERS
 */
const optionalProperty = (prop, customName) => prop && customName ? {
  [customName]: prop
} : {};

exports.optionalProperty = optionalProperty;

const successResponse = (status = 200, data) => ({
  statusCode: status,
  success: status >= 200 && status <= 350,
  ...optionalProperty(data, 'result')
});

exports.successResponse = successResponse;

const errorResponse = (status = 200, error, message) => ({
  statusCode: status,
  error,
  message
});

exports.errorResponse = errorResponse;

const gmToBuffer = data => new Promise((resolve, reject) => {
  data.stream((err, stdout, stderr) => {
    if (err) {
      return reject(err);
    }

    const chunks = [];
    stdout.on('data', chunk => {
      chunks.push(chunk);
    }); // these are 'once' because they can and do fire multiple times for multiple errors,
    // but this is a promise so you'll have to deal with them one at a time

    stdout.once('end', () => {
      resolve(Buffer.concat(chunks));
    });
    stderr.once('data', data => {
      reject(String(data));
    });
  });
});

exports.gmToBuffer = gmToBuffer;