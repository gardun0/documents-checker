"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _triggers = require("./triggers");

var _forceSlash = _interopRequireDefault(require("./utils/forceSlash"));

var _ensureCors = _interopRequireDefault(require("./utils/ensureCors"));

/**
 * @description source generator of the triggers
 */

/**
 * @description HOC that fixes path errors for express/https functions
 */

/**
 * @description HOC that ensure CORS for https functions
 */
var _default = (firebase, functions) => {
  return {
    /**
     * @description https function that validates documents already improved
     * @type {HttpsFunction}
     */
    CheckDocument: functions.https.onRequest((0, _forceSlash.default)((0, _ensureCors.default)((0, _triggers.checkDocument)(firebase)))),

    /**
     * @description Storage function that improves images for better Vision results
     * @type {CloudFunction<ObjectMetadata>}
     */
    ImproveImage: functions.storage.object().onFinalize((0, _triggers.improveImage)(firebase))
  };
}; // export const RequestRegister = functions.https.onRequest(forceSlash(ensureCors(Triggers.requestRegister)))




exports.default = _default;