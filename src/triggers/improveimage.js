import mime from 'mime-types'
import { basename, extname, dirname, resolve, format, normalize, join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import mkdirp from 'mkdirp-promise'

const gm = require('gm').subClass({ imageMagick: true })

const IMAGE_TYPE = 'image/png'

/**
 * @function grayAndConvert
 * @param firebase{string}
 * @returns {Function}
 */
const grayAndConvert = (path, destination) => new Promise((resolve, reject) => {
  gm(path)
    .type('Grayscale') // Convert the image with Grayscale colors
    .density(300, 300) // Upgrade the resolution
    .toBuffer('PNG', async (err, buffer) => {
      /**
       * We transform any image to PNG format
       * JPEG like other formats have compression
       * so we have to be able to get a better image
       * no matter what
       */
      if (err) reject(err)

      gm(buffer)
        .bitdepth(8)
        .blackThreshold(95)
        .level(5, 0, 50, 100)
        .write(destination, err => {
          if (err) reject(err)
          resolve()
        })
    })
})

export default (firebase) => async object => {
  const { name, bucket, contentType } = object

  try {
    console.log(object)
    // /**
    //  * @description instantiate the storage bucket
    //  * @type {Storage.Bucket}
    //  */
    // const storage = firebase.storage().bucket(bucket)
    //
    // /**
    //  * @description path from file
    //  * @type {string}
    //  */
    // const path = dirname(name)
    // console.log(path, name)
    // if (!(contentType || mime.lookup(name)).includes('image/')) return null
    //
    // /**
    //  * @description name of the file handled
    //  * @type {string}
    //  */
    // const fileName = basename(name, extname(name))
    //
    // /**
    //  * @description temp path for image
    //  * @type {string}
    //  */
    // const tempPath = resolve(tmpdir(), name)
    //
    // /**
    //  * @description upload path for image
    //  * @type {string}
    //  */
    // const uploadPath = normalize(format({
    //   ext: mime.extension(IMAGE_TYPE),
    //   base: fileName,
    //   dir: path
    // }))
    //
    // /**
    //  * @description temp path for converted image
    //  * @type {string}
    //  */
    // const tempConvertedPath = join(tmpdir(), uploadPath)
    //
    // await mkdirp(basename(tempPath))
    //
    // /**
    //  * @description downloads image to convert on temp directory
    //  */
    // await storage.file(name).download({ destination: tempPath })
    //
    // /**
    //  * @description improves the image and create its into temp path
    //  */
    // await grayAndConvert(tempPath, tempConvertedPath)
    //
    // await storage.upload(tempConvertedPath, { destination: uploadPath })
    //
    // unlinkSync(tempConvertedPath)
    // unlinkSync(tempPath)
    //
    // return null
  } catch (err) {
    console.error(err)
  }
}
