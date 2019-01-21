"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * @description fixes the path url, some cases it just dont prepend the slash
 * @param expressApp
 * @returns {function(*=, *=): *}
 */
var _default = expressApp => (request, response) => {
  if (!request.path) {
    request.url = `/${request.url}`; // prepend '/' to keep query params if any
  }

  return expressApp(request, response);
};

exports.default = _default;