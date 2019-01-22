import mime from 'mime-types'
import { basename, extname, dirname, format, normalize, join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import { gmToBuffer } from '@utils/helpers'
import mkdirp from 'mkdirp-promise'

const gm = require('gm').subClass({imageMagick: true})

const IMAGE_TYPE = 'image/png'

const saveInTemp = (gmInstance, destination) => new Promise((resolve, reject) => {
  gm(gmInstance)
    .write(destination, error => {
      if (error) reject(error)
      resolve()
    })
})

/**
 * @function grayAndConvert
 * @returns {Function}
 */
const grayAndConvert = (path) => new Promise((resolve, reject) => {
  gm(path)
    .type('Grayscale') // Convert the image with Grayscale colors
    .density(300, 300) // Upgrade the resolution
    .bitdepth(8)
    .blackThreshold(95)
    .level(5, 0, 50, 100)
    .toBuffer('PNG', (err, buffer) => {
      if (err) reject(err)
      resolve(buffer)
    })
})

export default firebase => async object => {
  const { name, bucket, contentType } = object
  console.log(object)
  try {
    /**
     * @description instantiate the storage bucket
     * @type {Storage.Bucket}
     */
    const storage = firebase.storage().bucket(bucket)

    /**
     * @description path from file
     * @type {string}
     */
    const path = dirname(name)

    if (!(contentType || mime.lookup(name)).includes('image/')) return null
    if (!name.includes('waiting')) return null
    if (name.includes('_improved')) return null

    /**
     * @description name of the file handled
     * @type {string}
     */
    const fileName = basename(name, extname(name))

    /**
     * @description temp path for image
     * @type {string}
     */
    const tempPath = join(tmpdir(), name)

    /**
     * @description upload path for image
     * @type {string}
     */
    const uploadPath = normalize(format({
      base: `${fileName}_improved.png`,
      dir: path
    }))

    /**
     * @description temp path for converted image
     * @type {string}
     */
    const tempConvertedPath = join(tmpdir(), uploadPath)

    await mkdirp(dirname(tempPath))

    /**
     * @description downloads image to convert on temp directory
     */
    await storage.file(name).download({ destination: tempPath })

    /**
     * @description improves the image and create its into temp path
     */
    const imageImproved = await grayAndConvert(tempPath)

    console.log(imageImproved)

    const fileToUpload = storage.file(uploadPath)

    await fileToUpload.save(imageImproved)

    unlinkSync(tempConvertedPath)
    unlinkSync(tempPath)

    return null
  } catch (err) {
    console.error(err)
  }
}
