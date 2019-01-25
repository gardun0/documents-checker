import mime from 'mime-types'
import { basename, extname, dirname, format, normalize, join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import { spawn } from 'child-process-promise'
import mkdirp from 'mkdirp-promise'
import { head } from 'ramda'
import { getDocumentDataFromName } from '@utils/helpers'

export default (firebase, config) => async object => {
  const { name, bucket, contentType } = object

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
    if (head(path.split('/')) !== (config.requestPath || 'documents_validation')) return null

    /**
     * @description name of the file handled
     * @type {string}
     */
    const fileName = basename(name, extname(name))

    const { id } = getDocumentDataFromName(fileName)

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
      dir: normalize(`/${config.responsePath || 'documents'}/${id}`)
    }))

    /**
     * @description temporal path for upload photo
     * @type {string}
     */
    const uploadTempPath = normalize(format({
      base: `${fileName}.png`,
      dir: dirname(tempPath)
    }))

    /**
     * @description temp path for converted image
     * @type {string}
     */
    const tempConvertedPath = join(tmpdir(), uploadPath)

    await mkdirp(dirname(tempPath))
    await mkdirp(join(tmpdir(), uploadPath))

    await storage.file(name).download({ destination: tempPath })

    await spawn('convert', [tempPath, '-density', '300', uploadTempPath], { capture: ['stdout', 'stderr'] })

    await spawn('convert', [uploadTempPath, '-type', 'Grayscale', '-depth', '8', '-level', '45%x55', uploadTempPath], { capture: ['stdout', 'stderr'] })

    await storage.upload(uploadTempPath, { destination: uploadPath })

    await storage.file(name).delete()

    unlinkSync(tempConvertedPath)
    unlinkSync(tempPath)

    return null
  } catch (err) {
    console.error(err)
  }
}
