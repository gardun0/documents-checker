"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _matchers = _interopRequireDefault(require("./matchers"));

var _ramda = require("ramda");

var _helpers = require("./helpers");

var _stringSimilarity = require("string-similarity");

const vision = require('@google-cloud/vision');

const CONFIDENCE_SPECTRE = 0.4;
const arrayWordToString = (0, _ramda.join)('');
const search = (0, _ramda.curry)((regex, str) => str.search(regex));
const match = (0, _ramda.curry)((regex, str) => str.match(regex));
/**
 * @description This extracts from the [source] the proper value and applies transformation if set
 * @param source
 * @returns {function(*): object}
 */

const getDataToMatch = source => props => (props.length ? props : []).reduce((accum, prop) => {
  const hasTransform = typeof prop === 'object' && !!prop.transform;
  return { ...accum,
    [typeof prop === 'string' ? prop : prop.value]: hasTransform ? prop.transform(source[prop.value]) : typeof prop === 'string' ? source[prop] : source[prop.value]
  };
}, {});
/**
 * @description gets the result from Google Vision API
 * @param path
 * @returns {Promise<*>}
 */


const getImageAndRequest = async path => {
  const results = await VisionClient.documentTextDetection(path);
  const {
    fullTextAnnotation,
    error
  } = (0, _ramda.head)(results);
  return error || fullTextAnnotation;
};
/**
 * @description determinate if the confidence is higher than the expected
 * @param spectre
 * @returns {function({confidence: *}): boolean}
 */


const filterByConfidence = spectre => ({
  confidence
}) => confidence * 1 >= spectre;
/**
 * @description extract and flatten a property from the array item
 * @param extractName
 * @returns {function(*=, *): array}
 */


const extractArray = extractName => (accum = [], val) => [...accum, ...(val[extractName] || [])];
/**
 * @description curried function to filter confidence and extract a property by item
 * @param extractName
 * @returns {function(*): *}
 */


const filterAndExtract = extractName => (arr = []) => arr.filter(filterByConfidence(CONFIDENCE_SPECTRE)).reduce(extractArray(extractName), []);
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
  const dateExpression = /\d{1,2}#?\/#?\d{1,2}#?\/#?\d{4}/m;
  const searchDates = search(dateExpression);
  const matchDates = match(dateExpression);
  /**
   * @description split the string to an array again
   * @type {Function}
   */

  const stringRecompose = (0, _ramda.split)('#');
  const searchResult = searchDates(wordSplit);
  /**
   * @description match resulted from regexp search
   * @type {string}
   */

  const [result] = matchDates(wordSplit) || [];
  const resultTransformed = (result || '').replace(/#/g, '');
  return searchResult > 0 ? stringRecompose(`${wordSplit.slice(0, searchResult)}${resultTransformed}${wordSplit.slice(searchResult + 1 + (result.length - 1))}`) : stringRecompose(wordSplit);
};
/**
 * @type {Function}
 * @returns {array}
 */


const transformRegexp = (0, _ramda.compose)(transformWords, (0, _ramda.join)('#'));
/**
 * @description filters and extract the properties to reach the word
 * @param blocks
 * @returns {array}
 */

const getWords = (0, _ramda.compose)(transformRegexp, (0, _ramda.map)((0, _ramda.compose)(arrayWordToString, (0, _ramda.map)(_ramda.toUpper), filterAndExtract('text'), (0, _ramda.prop)('symbols'))), filterAndExtract('words'), filterAndExtract('paragraphs'));
/**
 * @description get the confidence percentage by word
 * @param toCompare
 * @type function(*): {array}
 */

const getConfidenceByWord = toCompare => (0, _ramda.reduce)((accum, word) => {
  const dataToMatch = (0, _ramda.keys)(toCompare);
  /**
   * @description first match, word to word
   * @type {string}
   */

  const [match] = dataToMatch.filter(dataKey => (0, _stringSimilarity.compareTwoStrings)(toCompare[dataKey], word) >= CONFIDENCE_SPECTRE);
  return [...accum, ...(match ? [{
    match: toCompare[match],
    found: word,
    property: match,
    confidence: (0, _stringSimilarity.compareTwoStrings)(word, toCompare[match]).toFixed(2) * 1
  }] : [])];
}, []);
/**
 * @type {Function}
 * @returns {number}
 */


const getConfidenceFromMatches = (0, _ramda.curry)((data, propsFound) => propsFound.length >= data.length ? 100 : propsFound.length * 100 / data.length);
/**
 * @param data
 * @returns {function(*): array}
 */

const unifyDoubles = data => confidenceResults => {
  const results = confidenceResults.map((0, _ramda.prop)('property'));
  const doubles = results.filter((property, index, self) => index !== self.indexOf(property));
  const withoutDoubles = confidenceResults.filter(({
    property
  }) => !doubles.includes(property));
  const notDoublesAnymore = doubles.map(property => {
    const realValue = data[property].split(' ');
    const doubleValues = confidenceResults.filter(({
      property: resultProperty
    }) => resultProperty === property);
    return doubleValues.reduce((accum, {
      found
    }) => ({ ...accum,
      found: `${accum.found} ${found}`.trim()
    }), {
      match: realValue.join(' '),
      confidence: doubleValues.length * 100 / realValue.length,
      found: '',
      property
    });
  });
  return [...withoutDoubles, ...notDoublesAnymore];
};
/**
 * @param data
 * @returns {number}
 */


const getConfidenceResult = data => (0, _ramda.compose)((0, _ramda.divide)(_ramda.__, 100), getConfidenceFromMatches(data), (0, _ramda.map)((0, _ramda.prop)('property')));
/**
 * @description get the final result from all the results
 * @param compareWith
 * @returns {number}
 */


const compareWords = compareWith => (0, _ramda.compose)(getConfidenceResult((0, _ramda.keys)(compareWith)), unifyDoubles(compareWith), getConfidenceByWord(compareWith));
/**
 * @description Creates a new {ImageAnnotatorClient} client
 * @type {v1.ImageAnnotatorClient|ImageAnnotatorClient}
 */


const VisionClient = new vision.ImageAnnotatorClient();

var _default = async (filePath, type, config, toMatch) => {
  const dataToMatch = config.matchers ? config.matchers[type] : _matchers.default[type];
  if (!dataToMatch) return 0;

  if (!toMatch.nombre) {
    throw new Error('USUARIO INEXISTENTE');
  }
  /**
   * @var getAndTransform
   * @type function(*): {object}
   */


  const getAndTransform = getDataToMatch(toMatch);
  /**
   * @constant dataToUse
   * @type {object}
   */

  const wordToMatch = getAndTransform(dataToMatch);
  const visionResult = await getImageAndRequest(filePath);

  if (!visionResult || visionResult && visionResult.message) {
    throw new Error('SIN RESULTADOS DE VISION', (visionResult || {
      message: 'No se encontro nada'
    }).message);
  }

  const {
    pages: [result]
  } = visionResult;
  const {
    blocks = []
  } = { ...result,
    ...(0, _helpers.optionalProperty)(result.property ? null : {
      detectedLanguages: []
    }, 'property')
  };
  console.log('BLOCKS', blocks);
  /**
   * @description filter, order and compare all the words found from Vision API and get a confidence percentage
   * @type {Function}
   * @returns {number}
   */

  const getResult = (0, _ramda.compose)(compareWords(wordToMatch), getWords);
  return getResult(blocks);
};

exports.default = _default;