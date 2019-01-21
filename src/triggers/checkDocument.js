import ImageURI from 'image-data-uri'
import moment from 'moment'
import { gmToBuffer, errorResponse, successResponse, optionalProperty } from '@utils/helpers'
import { toUpper, compose, prop, map, join, reduce, split, keys, curry, divide, __ } from 'ramda'
import { compareTwoStrings } from 'string-similarity'
import axios from 'axios'

const vision = require('@google-cloud/vision')

const { NODE_ENV = 'production' } = process.env

const CONFIDENCE_SPECTRE = 0.4

/**
 * @description requires gm module and set subClass on production environment
 * @type {gm}
 */
const gm = require('gm').subClass({ imageMagick: NODE_ENV !== 'development' })

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
  { value: 'apellidoPat', transform: toUpper },
  { value: 'apellidoMat', transform: toUpper },
  { value: 'nombre', transform: toUpper },
  { value: 'curp', transform: toUpper },
  { value: 'fechaNacimiento', transform: getDateFromMS }
]

/**
 * @description format data to match with image
 * @type {array}
 */
const INE_R_PROPERTIES = [
  { value: 'apellidoPat', transform: toUpper },
  { value: 'apellidoMat', transform: toUpper },
  { value: 'nombre', transform: toUpper }
]

/**
 * @description format data to match with image
 * @type {array}
 */
const CD_PROPERTIES = [
  { value: 'calle', transform: toUpper },
  { value: 'colonia', transform: toUpper },
  { value: 'cp', transform: toUpper },
  { value: 'apellidoPat', transform: toUpper },
  { value: 'apellidoMat', transform: toUpper },
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
 * @function improveImage
 * @param buff
 * @returns {Promise<*>}
 */
const improveImage = async buff => {
  const gmInstance = gm(buff)
    .bitdepth(8)
    .blackThreshold(95)
    .level(5, 0, 50, 100)

  return gmToBuffer(gmInstance)
}

const arrayWordToString = join('')

/**
 * @function grayAndConvert
 * @param buff
 * @returns {Promise<any>}
 */
const grayAndConvert = buff => new Promise((resolve, reject) => {
  gm(buff)
    .type('Grayscale') // Convert the image with Grayscale colors
    .toBuffer('PNG', async (err, buffer) => {
      /**
       * We transform any image to PNG format
       * JPEG like other formats have compression
       * so we have to be able to get a better image
       * no matter what
       */
      if (err) reject(err)
      resolve(await improveImage(buffer))
    })
})

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
 * @param req
 * @param res
 * @returns {Promise<Response>}
 */
export default firebase => async (req, res) => {
  const { method, body } = req

  const { image = {}, info } = body

  try {
    /**
     * BEFORE EVERYTHING STARTS
     */
    if (method !== 'POST') return res.status(403).send(errorResponse(403, 'Solo se permite metodo POST'))
    if (!image.url || !image.type) return res.status(403).send(errorResponse(403, 'Hacen falta parametros de la imagen'))
    if (image.type !== 'INEA' && image.type !== 'INER' && image.type !== 'CD') return res.status(403).send(errorResponse(403, 'Tipo de imagen invalido'))
    if (!info) return res.status(403).send(errorResponse(403, 'Informacion de usuario requerida'))

    /**
     * @var getAndTransform
     * @type function(*): {object}
     */
    const getAndTransform = getDataToMatch(info)
    console.log(info)
    /**
     * @var propertiesByType
     * @description Gets the properties to evaluate for this type of image
     * @type object[]
     */
    const propertiesByType = image.type === 'INEA'
      ? INE_A_PROPERTIES
      : image.type === 'INER'
        ? INE_R_PROPERTIES
        : image.type === 'CD'
          ? CD_PROPERTIES
          : []
    console.log(propertiesByType)
    /**
     * @constant dataToUse
     * @type {object}
     */
    const wordToMatch = getAndTransform(propertiesByType)
    console.log(image.url)
    const { data: imageData } = await axios.get(image.url, {
      responseType: 'arraybuffer',
      transformResponse: [(data) => Buffer.from(data)]
    })
    console.log(imageData)
    /**
     * @description result from image improved
     * @type {any}
     */
    const imageImproved = await grayAndConvert(imageData)

    const { pages: [ result ] } = await getImageAndRequest(imageImproved)

    const { blocks = [], property: { detectedLanguages = [] } } = {
      ...result,
      ...optionalProperty(result.property
        ? null
        : { detectedLanguages: [] }, 'property')
    }

    /**
     * @description get predominant language
     * @type {object}
     */
    const predominantLanguage = detectedLanguages.reduce(({ languageCode: lastLanguageCode, confidence: lastConfidence }, { languageCode, confidence }) => ({
      languageCode: lastConfidence > confidence ? lastLanguageCode : languageCode,
      confidence: lastConfidence > confidence ? lastConfidence : confidence
    }), { languageCode: 'es', confidence: 0 })

    /**
     * @description filter, order and compare all the words found from Vision API and get a confidence percentage
     * @type {Function}
     * @returns {number}
     */
    const getResult = compose(
      compareWords(wordToMatch),
      getWords
    )

    res.status(200).send(successResponse(200, {
      confidence: getResult(blocks),
      language: predominantLanguage.languageCode
    }))
  } catch (err) {
    return res.status(500).send(errorResponse(500, 'INTERNAL_ERROR', err.message))
  }
}
