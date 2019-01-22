"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _corsify = _interopRequireDefault(require("corsify"));

/**
 * @description curried function, this sets the CORS headers
 * @type {Function}
 */
const ensureCors = (0, _corsify.default)({
  'Access-Control-Allow-Methods': 'POST, GET, PATCH, PUT',
  'Access-Control-Request-Headers': 'Content-Type',
  'Access-Control-Allow-Origin': '*'
});
/**
 * @description curried function, this sets the headers to the express request
 * @param request
 * @param response
 * @returns {Function}
 */

var _default = (request, response) => ensureCors(request, response);

exports.default = _default;