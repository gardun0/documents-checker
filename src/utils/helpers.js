/**
 * GENERAL HELPERS
 */

export const optionalProperty = (prop, customName) => prop && customName
  ? { [customName]: prop }
  : {}

export const successResponse = (status = 200, data) => ({
  statusCode: status,
  success: status >= 200 && status <= 350,
  ...optionalProperty(data, 'result')
})

export const errorResponse = (status = 200, error, message) => ({
  statusCode: status,
  error,
  message
})
