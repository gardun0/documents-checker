import { toUpper } from 'ramda'

/**
 * GENERAL HELPERS
 */

export const getDocumentDataFromName = str => {
  const [ id, type ] = str.split('_')

  return { id, type }
}

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
