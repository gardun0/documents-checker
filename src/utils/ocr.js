import getMatcher from '@utils/matchers'
import { toUpper, compose, prop, map, join, reduce, split, keys, curry, divide, __, head } from 'ramda'
import { optionalProperty } from '@utils/helpers'
import { compareTwoStrings } from 'string-similarity'

const vision = require('@google-cloud/vision')

const CONFIDENCE_SPECTRE = 0.4

const arrayWordToString = join('')

const search = curry((regex, str) => str.search(regex))
const match = curry((regex, str) => str.match(regex))

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
 * @param path
 * @returns {Promise<*>}
 */
const getImageAndRequest = async path => {
  const results = await VisionClient
    .documentTextDetection(path)

  const { fullTextAnnotation, error } = head(results)

  return error || fullTextAnnotation
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
 * @description Creates a new {ImageAnnotatorClient} client
 * @type {v1.ImageAnnotatorClient|ImageAnnotatorClient}
 */
const VisionClient = new vision.ImageAnnotatorClient()

export default async (filePath, type, config, toMatch) => {
  const dataToMatch = config.matchers ? config.matchers[type] : getMatcher[type]

  if (!dataToMatch) return 0

  if (!toMatch.nombre) {
    console.log('USUARIO INEXISTENTE')
    return 0
  }

  /**
   * @var getAndTransform
   * @type function(*): {object}
   */
  const getAndTransform = getDataToMatch(toMatch)

  /**
   * @constant dataToUse
   * @type {object}
   */
  const wordToMatch = getAndTransform(dataToMatch)

  const visionResult = await getImageAndRequest(filePath)

  if (!visionResult || (visionResult && visionResult.message)) {
    console.log('SIN RESULTADOS DE VISION', (visionResult || { message: 'No se encontro nada' }).message)
    return 0
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

  return getResult(blocks)
}
