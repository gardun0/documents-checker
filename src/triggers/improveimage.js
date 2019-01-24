import mime from 'mime-types'
import { basename, extname, dirname, format, normalize, join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import { spawn } from 'child-process-promise'
import mkdirp from 'mkdirp-promise'

// const IMAGE_TYPE = 'image/png'
//
// const saveInTemp = (gmInstance, destination) => new Promise((resolve, reject) => {
//   gm(gmInstance)
//     .write(destination, error => {
//       if (error) reject(error)
//       resolve()
//     })
// })
//
// /**
//  * @function grayAndConvert
//  * @returns {Function}
//  */
// const grayAndConvert = buff => new Promise((resolve, reject) => {
//   gm(buff)
//     .type('Grayscale') // Convert the image with Grayscale colors
//     .density(300, 300) // Upgrade the resolution
//     .toBuffer('PNG', async (err, buffer) => {
//       if (err) reject(err)
//
//       const gmInstance = gm(buffer)
//         .bitdepth(8)
//         .blackThreshold(95)
//         .level(5, 0, 50, 100)
//
//       resolve(await gmToBuffer(gmInstance))
//     })
// })

export default (firebase, config) => async object => {
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

    const improvingExtname = config.extname ? `_${config.extname}` : '_improved'

    if (!(contentType || mime.lookup(name)).includes('image/')) return null
    if (!name.includes(config.requestPath || 'documents_validation')) return null
    if (name.includes(improvingExtname)) return null

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
      base: `${fileName}${improvingExtname}.png`,
      dir: path
    }))

    /**
     * @description temp path for converted image
     * @type {string}
     */
    const tempConvertedPath = join(tmpdir(), uploadPath)

    await mkdirp(dirname(tempPath))

    await storage.file(name).download({ destination: tempPath })

    await spawn('convert', [tempPath, '-density', '300', tempConvertedPath], { capture: ['stdout', 'stderr'] })

    await spawn('convert', [tempConvertedPath, '-type', 'Grayscale', '-depth', '8', '-level', '50%x55', tempConvertedPath], { capture: ['stdout', 'stderr'] })

    await storage.upload(tempConvertedPath, { destination: uploadPath })

    unlinkSync(tempConvertedPath)
    unlinkSync(tempPath)

    return null
  } catch (err) {
    console.error(err)
  }
}
