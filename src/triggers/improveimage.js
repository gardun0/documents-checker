import mime from 'mime-types'
import { basename, extname, dirname, format, normalize, join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import { spawn } from 'child-process-promise'
import mkdirp from 'mkdirp-promise'
import { getDocumentDataFromName } from '@utils/helpers'

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

    if (!(contentType || mime.lookup(name)).includes('image/')) return null
    if (path.split('/')[1] !== (config.requestPath || 'documents_validation')) return null

    /**
     * @description name of the file handled
     * @type {string}
     */
    const fileName = basename(name, extname(name))

    const { id, type } = getDocumentDataFromName(fileName)

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
      base: `${fileName}.png`,
      dir: normalize(`'/${config.requestPath || 'documents'}/${id}`)
    }))

    /**
     * @description temp path for converted image
     * @type {string}
     */
    const tempConvertedPath = join(tmpdir(), uploadPath)

    await mkdirp(dirname(tempPath))

    await storage.file(name).download({ destination: tempPath })

    await spawn('convert', [tempPath, '-density', '300', tempConvertedPath], { capture: ['stdout', 'stderr'] })

    await spawn('convert', [tempConvertedPath, '-type', 'Grayscale', '-depth', '8', '-level', '45%x55', tempConvertedPath], { capture: ['stdout', 'stderr'] })

    await storage.upload(tempConvertedPath, { destination: uploadPath })

    await storage.file(name).delete()

    unlinkSync(tempConvertedPath)
    unlinkSync(tempPath)

    return null
  } catch (err) {
    console.error(err)
  }
}
