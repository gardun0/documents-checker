import corsify from 'corsify'

/**
 * @description curried function, this sets the CORS headers
 * @type {Function}
 */
const ensureCors = corsify({
  'Access-Control-Allow-Methods': 'POST, GET, PATCH, PUT',
  'Access-Control-Request-Headers': 'Content-Type',
  'Access-Control-Allow-Origin': '*'
})

/**
 * @description curried function, this sets the headers to the express request
 * @param request
 * @param response
 * @returns {Function}
 */
export default (request, response) => ensureCors(request, response)
