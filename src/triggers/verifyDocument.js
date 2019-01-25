import moment from 'moment'
import { gmToBuffer, errorResponse, successResponse, optionalProperty } from '@utils/helpers'
import databaseWrapper from '@utils/firebase'
import { toUpper, compose, prop, map, join, reduce, split, keys, curry, divide, __, head } from 'ramda'
import { compareTwoStrings } from 'string-similarity'
import { basename, extname, dirname, format, normalize, join as pathJoin } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import axios from 'axios'

const vision = require('@google-cloud/vision')

const CONFIDENCE_SPECTRE = 0.4

const arrayWordToString = join('')

/**
 * @description converts milliseconds to INE's date format
 * @param ms
 * @returns {string}
 */
const getDateFromMS = ms => moment(new Date(ms * 1)).format('DD/MM/YYYY')

const search = curry((regex, str) => str.search(regex))
const match = curry((regex, str) => str.match(regex))

/**
 * @description format data to match with image
 * @type {array}
 */
const INE_A_PROPERTIES = [
  { value: 'apellidoPaterno', transform: toUpper },
  { value: 'apellidoMaterno', transform: toUpper },
  { value: 'nombre', transform: toUpper },
  { value: 'curp', transform: toUpper },
  { value: 'fecha', transform: getDateFromMS }
]

/**
 * @description format data to match with image
 * @type {array}
 */
const INE_R_PROPERTIES = [
  { value: 'apellidoPaterno', transform: toUpper },
  { value: 'apellidoMaterno', transform: toUpper },
  { value: 'nombre', transform: toUpper }
]

/**
 * @description format data to match with image
 * @type {array}
 */
const CD_PROPERTIES = [
  { value: 'calle', transform: toUpper },
  { value: 'colonia', transform: toUpper },
  { value: 'codigoPostal', transform: toUpper },
  { value: 'apellidoPaterno', transform: toUpper },
  { value: 'apellidoMaterno', transform: toUpper },
  { value: 'nombre', transform: toUpper },
  { value: 'estado', transform: toUpper },
  { value: 'municipio', transform: toUpper }
]
/**
 * @description Creates a new {ImageAnnotatorClient} client
 * @type {v1.ImageAnnotatorClient|ImageAnnotatorClient}
 */
const VisionClient = new vision.ImageAnnotatorClient()

/**
 * @description This extracts from the [source] the proper value and applies transformation if set
 * @param source
 * @returns {function(*): object}
 */
const getDataToMatch = source => props => (props.length ? props : [])
  .reduce((accum, prop) => {
    const hasTransform = typeof prop === 'object' && !!prop.transform

    return {
      ...accum,
      [typeof prop === 'string' ? prop : prop.value]: hasTransform
        ? prop.transform(source[prop.value])
        : typeof prop === 'string'
          ? source[prop]
          : source[prop.value]
    }
  }, {})

/**
 * @description gets the result from Google Vision API
 * @param imageBuffer
 * @returns {Promise<*>}
 */
const getImageAndRequest = async imageBuffer => {
  const results = await VisionClient
    .documentTextDetection({ image: { content: imageBuffer } })
  console.log(results)
  const { fullTextAnnotation } = results[0]

  return fullTextAnnotation
}

/**
 * @description determinate if the confidence is higher than the expected
 * @param spectre
 * @returns {function({confidence: *}): boolean}
 */
const filterByConfidence = spectre => ({ confidence }) => confidence * 1 >= spectre

/**
 * @description extract and flatten a property from the array item
 * @param extractName
 * @returns {function(*=, *): array}
 */
const extractArray = extractName => (accum = [], val) => [ ...accum, ...(val[extractName] || []) ]

/**
 * @description curried function to filter confidence and extract a property by item
 * @param extractName
 * @returns {function(*): *}
 */
const filterAndExtract = extractName => (arr = []) => arr
  .filter(filterByConfidence(CONFIDENCE_SPECTRE))
  .reduce(extractArray(extractName), [])

/**
 * @description transform dates from words array
 * @param wordSplit
 * @returns {array}
 */
const transformWords = wordSplit => {
  /**
   * @description  match dates
   * @type {RegExp}
   */
  const dateExpression = /\d{1,2}#?\/#?\d{1,2}#?\/#?\d{4}/m

  const searchDates = search(dateExpression)
  const matchDates = match(dateExpression)

  /**
   * @description split the string to an array again
   * @type {Function}
   */
  const stringRecompose = split('#')

  const searchResult = searchDates(wordSplit)

  /**
   * @description match resulted from regexp search
   * @type {string}
   */
  const [ result ] = matchDates(wordSplit) || []

  const resultTransformed = (result || '').replace(/#/g, '')

  return searchResult > 0
    ? stringRecompose(`${wordSplit.slice(0, searchResult)}${resultTransformed}${wordSplit.slice((searchResult + 1) + (result.length - 1))}`)
    : stringRecompose(wordSplit)
}

/**
 * @type {Function}
 * @returns {array}
 */
const transformRegexp = compose(transformWords, join('#'))

/**
 * @description filters and extract the properties to reach the word
 * @param blocks
 * @returns {array}
 */
const getWords = compose(
  transformRegexp,
  map(compose(
    arrayWordToString,
    map(toUpper),
    filterAndExtract('text'),
    prop('symbols')
  )),
  filterAndExtract('words'),
  filterAndExtract('paragraphs')
)

/**
 * @description get the confidence percentage by word
 * @param toCompare
 * @type function(*): {array}
 */
const getConfidenceByWord = toCompare => reduce((accum, word) => {
  const dataToMatch = keys(toCompare)

  /**
   * @description first match, word to word
   * @type {string}
   */
  const [ match ] = dataToMatch.filter(dataKey => compareTwoStrings(toCompare[dataKey], word) >= CONFIDENCE_SPECTRE)

  return [
    ...accum,
    ...(match
      ? [{
        match: toCompare[match],
        found: word,
        property: match,
        confidence: compareTwoStrings(word, toCompare[match]).toFixed(2) * 1
      }] : [])
  ]
}, [])

/**
 * @type {Function}
 * @returns {number}
 */
const getConfidenceFromMatches = curry((data, propsFound) => propsFound.length >= data.length
  ? 100 : (propsFound.length * 100) / data.length)

/**
 * @param data
 * @returns {function(*): array}
 */
const unifyDoubles = data => confidenceResults => {
  const results = confidenceResults.map(prop('property'))
  const doubles = results.filter((property, index, self) => index !== self.indexOf(property))
  const withoutDoubles = confidenceResults.filter(({ property }) => !doubles.includes(property))

  const notDoublesAnymore = doubles.map(property => {
    const realValue = data[property].split(' ')
    const doubleValues = confidenceResults
      .filter(({ property: resultProperty }) => resultProperty === property)

    return doubleValues
      .reduce((accum, { found }) => ({
        ...accum,
        found: `${accum.found} ${found}`.trim()
      }), {
        match: realValue.join(' '),
        confidence: (doubleValues.length * 100) / realValue.length,
        found: '',
        property
      })
  })

  return [
    ...withoutDoubles,
    ...notDoublesAnymore
  ]
}

/**
 * @param data
 * @returns {number}
 */
const getConfidenceResult = data => compose(
  divide(__, 100),
  getConfidenceFromMatches(data),
  map(prop('property'))
)

/**
 * @description get the final result from all the results
 * @param compareWith
 * @returns {number}
 */
const compareWords = compareWith => compose(
  getConfidenceResult(keys(compareWith)),
  unifyDoubles(compareWith),
  getConfidenceByWord(compareWith)
)

/**
 * @description main function
 * @returns {Promise<Response>}
 */
export default (firebase, config) => async object => {
  const { name, bucket } = object

  const storage = firebase.storage().bucket(bucket)

  const database = databaseWrapper(firebase)

  try {
    /**
     * BEFORE EVERYTHING STARTS
     */
    const path = dirname(name)
    const fileName = basename(name, extname(name))

    if (head(path.split('/')) !== (config.responsePath || 'documents')) return null
    if (fileName !== 'INEA' || fileName !== 'INER' || fileName !== 'CD') return null

    const [ , uId ] = path.split('/')

    const userData = await database.fetch(`/fisa_renewals/${uId}`)

    if (!userData.nombre) {
      await database.update(`/fisa_documents/${uId}/${fileName}`, 0)
      console.log('USUARIO INEXISTENTE')
      return null
    }

    /**
     * @var getAndTransform
     * @type function(*): {object}
     */
    const getAndTransform = getDataToMatch(userData)

    /**
     * @var propertiesByType
     * @description Gets the properties to evaluate for this type of image
     * @type object[]
     */
    const propertiesByType = fileName === 'INEA'
      ? INE_A_PROPERTIES
      : fileName === 'INER'
        ? INE_R_PROPERTIES
        : fileName === 'CD'
          ? CD_PROPERTIES
          : []

    /**
     * @constant dataToUse
     * @type {object}
     */
    const wordToMatch = getAndTransform(propertiesByType)

    const imageData = await storage.file(name).download()

    const visionResult = await getImageAndRequest(imageData)

    if (!visionResult.pages) {
      await database.update(`/fisa_documents/${uId}/${fileName}`, 0)
      console.log('SIN RESULTADOS DE VISION')
      return null
    }

    const { pages: [ result ] } = visionResult

    const { blocks = [] } = {
      ...result,
      ...optionalProperty(result.property
        ? null
        : { detectedLanguages: [] }, 'property')
    }

    /**
     * @description filter, order and compare all the words found from Vision API and get a confidence percentage
     * @type {Function}
     * @returns {number}
     */
    const getResult = compose(
      compareWords(wordToMatch),
      getWords
    )

    await database.update(`/fisa_documents/${uId}/${fileName}`, getResult(blocks))
    return null
  } catch (err) {
    console.error(err)
  }
}
