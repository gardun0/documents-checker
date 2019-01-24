"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.errorResponse = exports.successResponse = exports.optionalProperty = exports.getDocumentDataFromName = void 0;

var _ramda = require("ramda");

/**
 * GENERAL HELPERS
 */
const getDocumentDataFromName = str => {
  const [id, type] = str.split('_');
  return {
    id,
    type
  };
};

exports.getDocumentDataFromName = getDocumentDataFromName;

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