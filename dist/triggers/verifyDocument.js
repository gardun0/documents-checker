"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _mimeTypes = _interopRequireDefault(require("mime-types"));

var _path = require("path");

var _os = require("os");

var _fs = require("fs");

var _childProcessPromise = require("child-process-promise");

var _mkdirpPromise = _interopRequireDefault(require("mkdirp-promise"));

var _ramda = require("ramda");

var _helpers = require("../utils/helpers");

var _firebase = _interopRequireDefault(require("../utils/firebase"));

var _ocr = _interopRequireDefault(require("../utils/ocr"));

var _default = (firebase, config) => async object => {
  const {
    name,
    bucket,
    contentType
  } = object;
  const database = (0, _firebase.default)(firebase);

  try {
    /**
     * @description instantiate the storage bucket
     * @type {Storage.Bucket}
     */
    const storage = firebase.storage().bucket(bucket);
    console.log('NAME', name);
    /**
     * @description path from file
     * @type {string}
     */

    const path = (0, _path.dirname)(name);
    if (!(contentType || _mimeTypes.default.lookup(name)).includes('image/')) return null;
    if ((0, _ramda.head)(path.split('/')) !== (config.requestPath || 'documents_validation')) return null;
    /**
     * @description name of the file handled
     * @type {string}
     */

    const fileName = (0, _path.basename)(name, (0, _path.extname)(name));
    const {
      id,
      type
    } = (0, _helpers.getDocumentDataFromName)(fileName);
    /**
     * @description temp path for image
     * @type {string}
     */

    const tempPath = (0, _path.join)((0, _os.tmpdir)(), name);
    /**
     * @description temporal path for upload photo
     * @type {string}
     */

    const convertedTempPath = (0, _path.normalize)((0, _path.format)({
      base: `${fileName}.png`,
      dir: (0, _path.dirname)(tempPath)
    }));
    await (0, _mkdirpPromise.default)((0, _path.dirname)(tempPath));
    await storage.file(name).download({
      destination: tempPath
    });
    await (0, _childProcessPromise.spawn)('convert', [tempPath, '-density', '300', '-type', 'Grayscale', '-depth', '8', '-level', '45%x55', convertedTempPath], {
      capture: ['stdout', 'stderr']
    });
    const userData = await database.fetch(`${config.dataPath}/${id}`);
    console.log('USER', userData);
    const result = await (0, _ocr.default)(convertedTempPath, type, config, userData);
    await database.update(`${config.resultPath}/${id}`, {
      [type]: result
    });
    (0, _fs.unlinkSync)(tempPath);
    return null;
  } catch (err) {
    console.error(err);
  }
};

exports.default = _default;