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

var _mkdirpPromise = _interopRequireDefault(require("mkdirp-promise"));

const gm = require('gm').subClass({
  imageMagick: true
});

const IMAGE_TYPE = 'image/png';
/**
 * @function grayAndConvert
 * @returns {Function}
 */

const grayAndConvert = (path, destination) => new Promise((resolve, reject) => {
  gm(path).type('Grayscale') // Convert the image with Grayscale colors
  .density(300, 300) // Upgrade the resolution
  .toBuffer('PNG', async (err, buffer) => {
    /**
     * We transform any image to PNG format
     * JPEG like other formats have compression
     * so we have to be able to get a better image
     * no matter what
     */
    if (err) reject(err);
    gm(buffer).bitdepth(8).blackThreshold(95).level(5, 0, 50, 100).write(destination, err => {
      if (err) reject(err);
      resolve();
    });
  });
});

var _default = firebase => async object => {
  const {
    name,
    bucket,
    contentType
  } = object;

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
    /**
     * @description name of the file handled
     * @type {string}
     */

    const fileName = (0, _path.basename)(name, (0, _path.extname)(name));
    /**
     * @description temp path for image
     * @type {string}
     */

    const tempPath = (0, _path.resolve)((0, _os.tmpdir)(), name);
    /**
     * @description upload path for image
     * @type {string}
     */

    const uploadPath = (0, _path.normalize)((0, _path.format)({
      ext: _mimeTypes.default.extension(IMAGE_TYPE),
      base: fileName,
      dir: path
    }));
    /**
     * @description temp path for converted image
     * @type {string}
     */

    const tempConvertedPath = (0, _path.join)((0, _os.tmpdir)(), uploadPath);
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