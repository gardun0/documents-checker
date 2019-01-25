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

var _default = (firebase, config) => async object => {
  const {
    name,
    bucket,
    contentType
  } = object;
  console.log(object);
  console.log((0, _path.dirname)(name));

  try {
    /**
     * @description instantiate the storage bucket
     * @type {Storage.Bucket}
     */
    const storage = firebase.storage().bucket(bucket);
    /**
     * @description path from file
     * @type {string}
     */

    const path = (0, _path.dirname)(name);
    console.log(path, path.split('/'));
    if (!(contentType || _mimeTypes.default.lookup(name)).includes('image/')) return null;
    if ((0, _ramda.head)(path.split('/')) !== (config.requestPath || 'documents_validation')) return null;
    /**
     * @description name of the file handled
     * @type {string}
     */

    const fileName = (0, _path.basename)(name, (0, _path.extname)(name));
    const {
      id
    } = (0, _helpers.getDocumentDataFromName)(fileName);
    /**
     * @description temp path for image
     * @type {string}
     */

    const tempPath = (0, _path.join)((0, _os.tmpdir)(), name);
    /**
     * @description upload path for image
     * @type {string}
     */

    const uploadPath = (0, _path.normalize)((0, _path.format)({
      base: `${fileName}.png`,
      dir: (0, _path.normalize)(`/${config.responsePath || 'documents'}/${id}`)
    }));
    console.log(uploadPath);
    /**
     * @description temp path for converted image
     * @type {string}
     */

    const tempConvertedPath = (0, _path.join)((0, _os.tmpdir)(), uploadPath);
    await (0, _mkdirpPromise.default)((0, _path.dirname)(tempPath));
    await (0, _mkdirpPromise.default)((0, _path.join)((0, _os.tmpdir)(), uploadPath));
    await storage.file(name).download({
      destination: tempPath
    });
    await (0, _childProcessPromise.spawn)('convert', [tempPath, '-density', '300', tempConvertedPath], {
      capture: ['stdout', 'stderr']
    });
    await (0, _childProcessPromise.spawn)('convert', [tempConvertedPath, '-type', 'Grayscale', '-depth', '8', '-level', '45%x55', tempConvertedPath], {
      capture: ['stdout', 'stderr']
    });
    await storage.upload(tempConvertedPath, {
      destination: uploadPath
    });
    await storage.file(name).delete();
    (0, _fs.unlinkSync)(tempConvertedPath);
    (0, _fs.unlinkSync)(tempPath);
    return null;
  } catch (err) {
    console.error(err);
  }
};

exports.default = _default;