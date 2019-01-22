/**
 * @description source generator of the triggers
 */
import { checkDocument, improveImage } from '@triggers'

export default firebase => {
  return {
    /**
     * @description https function that validates documents already improved
     * @type {Function}
     */
    CheckDocument: checkDocument(firebase),

    /**
     * @description Storage function that improves images for better Vision results
     * @type {Function}
     */
    ImproveImage: improveImage(firebase)
  }
}
