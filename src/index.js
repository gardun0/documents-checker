/**
 * @description source generator of the triggers
 */
import { verify } from 'triggers'

export default (firebase, config = {}) => {
  return {
    /**
     * @description Storage function that improves images for better Vision results
     * @type {Function}
     */
    VerifyDocument: verify(firebase, config)
  }
}
