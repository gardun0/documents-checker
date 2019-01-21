import { toUpper } from 'ramda'

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

export const gmToBuffer = data => new Promise((resolve, reject) => {
  data.stream((err, stdout, stderr) => {
    if (err) { return reject(err) }
    const chunks = []
    stdout.on('data', (chunk) => { chunks.push(chunk) })
    // these are 'once' because they can and do fire multiple times for multiple errors,
    // but this is a promise so you'll have to deal with them one at a time
    stdout.once('end', () => { resolve(Buffer.concat(chunks)) })
    stderr.once('data', (data) => { reject(String(data)) })
  })
})
