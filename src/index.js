/**
 * @description source generator of the triggers
 */
import { checkDocument, improveImage } from '@triggers'

export default (firebase) => {
  return {
    CheckDocument: checkDocument(firebase),
    ImproveImage: improveImage(firebase)
  }
}

// export const RequestRegister = functions.https.onRequest(forceSlash(ensureCors(Triggers.requestRegister)))

/**
 * @description https function that validates documents already improved
 * @type {HttpsFunction}
 */

/**
 * @description Storage function that improves images for better Vision results
 * @type {CloudFunction<ObjectMetadata>}
 */
