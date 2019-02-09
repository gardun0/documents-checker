"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _triggers = require("./triggers");

/**
 * @description source generator of the triggers
 */
var _default = (firebase, config = {}) => {
  return {
    /**
     * @description Storage function that improves images for better Vision results
     * @type {Function}
     */
    VerifyDocument: (0, _triggers.verify)(firebase, config)
  };
};

exports.default = _default;