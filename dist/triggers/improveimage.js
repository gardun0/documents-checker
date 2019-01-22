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

var _helpers = require("../utils/helpers");

var _mkdirpPromise = _interopRequireDefault(require("mkdirp-promise"));

const gm = require('gm').subClass({
  imageMagick: true
});

const IMAGE_TYPE = 'image/png';

const saveInTemp = (gmInstance, destination) => new Promise((resolve, reject) => {
  gm(gmInstance).write(destination, error => {
    if (error) reject(error);
    resolve();
  });
});
/**
 * @function grayAndConvert
 * @returns {Function}
 */


const grayAndConvert = async (path, destination) => {
  const gmInstance = gm(path).type('Grayscale') // Convert the image with Grayscale colors
  .density(300, 300) // Upgrade the resolution
  .bitdepth(8).blackThreshold(95).level(5, 0, 50, 100);
  const buffer = await (0, _helpers.gmToBuffer)(gmInstance);
  return saveInTemp(buffer, destination);
};

var _default = firebase => async object => {
  const {
    name,
    bucket,
    contentType
  } = object;
  console.log(object);

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
    if (!(contentType || _mimeTypes.default.lookup(name)).includes('image/')) return null;
    if (!name.includes('waiting')) return null;
    if (!name.includes('_improved')) return null;
    /**
     * @description name of the file handled
     * @type {string}
     */

    const fileName = (0, _path.basename)(name, (0, _path.extname)(name));
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
      ext: `.${_mimeTypes.default.extension(IMAGE_TYPE)}`,
      base: `${fileName}_improved.png`,
      dir: path
    }));
    /**
     * @description temp path for converted image
     * @type {string}
     */

    const tempConvertedPath = (0, _path.join)((0, _os.tmpdir)(), uploadPath);
    console.log(tempConvertedPath, uploadPath, tempPath);
    await (0, _mkdirpPromise.default)((0, _path.dirname)(tempPath));
    /**
     * @description downloads image to convert on temp directory
     */

    await storage.file(name).download({
      destination: tempPath
    });
    /**
     * @description improves the image and create its into temp path
     */

    await grayAndConvert(tempPath, tempConvertedPath);
    await storage.upload(tempConvertedPath, {
      destination: uploadPath
    });
    (0, _fs.unlinkSync)(tempConvertedPath);
    (0, _fs.unlinkSync)(tempPath);
    return null;
  } catch (err) {
    console.error(err);
  }
};

exports.default = _default;