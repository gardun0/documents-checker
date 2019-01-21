/**
 * @description source generator of the triggers
 */
import { checkDocument, improveImage } from '@triggers'

/**
 * @description HOC that fixes path errors for express/https functions
 */
import forceSlash from '@utils/forceSlash'

/**
 * @description HOC that ensure CORS for https functions
 */
import ensureCors from '@utils/ensureCors'

export default (firebase, functions) => {
  return {
    CheckDocument: functions.https.onRequest(forceSlash(ensureCors(checkDocument(firebase)))),
    ImproveImage: functions.storage.object().onFinalize(improveImage(firebase))
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
