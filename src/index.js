/**
 * @description source generator of the triggers
 */
import { improveImage, verify } from '@triggers'

export default (firebase, config = {}) => {
  return {
    /**
     * @description Storage function that improves images for better Vision results
     * @type {Function}
     */
    ImproveImage: improveImage(firebase, config),

    VerifyDocument: verify(firebase, config)
  }
}
