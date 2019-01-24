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
     * @description https function that validates documents already improved
     * @type {Function}
     */
    CheckDocument: (0, _triggers.checkDocument)(firebase),

    /**
     * @description Storage function that improves images for better Vision results
     * @type {Function}
     */
    ImproveImage: (0, _triggers.improveImage)(firebase, config)
  };
};

exports.default = _default;