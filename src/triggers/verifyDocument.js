import mime from 'mime-types'
import { basename, extname, dirname, format, normalize, join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import { spawn } from 'child-process-promise'
import mkdirp from 'mkdirp-promise'
import { head } from 'ramda'
import { getDocumentDataFromName } from 'utils/helpers'

import databaseWrapper from 'utils/firebase'
import getOCRResult from 'utils/ocr'

export default (firebase, config) => async object => {
  const { name, bucket, contentType } = object

  const database = databaseWrapper(firebase)

  try {
    /**
     * @description instantiate the storage bucket
     * @type {Storage.Bucket}
     */
    const storage = firebase.storage().bucket(bucket)
    console.log('NAME', name)
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

    const { id, type } = getDocumentDataFromName(fileName)

    /**
     * @description temp path for image
     * @type {string}
     */
    const tempPath = join(tmpdir(), name)

    /**
     * @description temporal path for upload photo
     * @type {string}
     */
    const convertedTempPath = normalize(format({
      base: `${fileName}.png`,
      dir: dirname(tempPath)
    }))

    await mkdirp(dirname(tempPath))

    await storage.file(name).download({ destination: tempPath })

    await spawn('convert', [tempPath, '-density', '300', '-type', 'Grayscale', '-depth', '8', '-level', '45%x55', convertedTempPath], { capture: ['stdout', 'stderr'] })

    const userData = await database.fetch(`${config.dataPath}/${id}`)
    console.log('USER', userData)
    const result = await getOCRResult(convertedTempPath, type, config, userData)

    await database.update(`${config.resultPath}/${id}`, {
      [type]: result
    })

    unlinkSync(tempPath)

    return null
  } catch (err) {
    console.error(err)
  }
}
