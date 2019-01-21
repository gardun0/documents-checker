/**
 * @description fixes the path url, some cases it just dont prepend the slash
 * @param expressApp
 * @returns {function(*=, *=): *}
 */
export default expressApp => (request, response) => {
  if (!request.path) {
    request.url = `/${request.url}` // prepend '/' to keep query params if any
  }

  return expressApp(request, response)
}
