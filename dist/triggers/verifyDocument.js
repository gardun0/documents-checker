"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _moment = _interopRequireDefault(require("moment"));

var _helpers = require("../utils/helpers");

var _firebase = _interopRequireDefault(require("../utils/firebase"));

var _ramda = require("ramda");

var _stringSimilarity = require("string-similarity");

var _path = require("path");

var _os = require("os");

var _fs = require("fs");

var _axios = _interopRequireDefault(require("axios"));

var _mkdirpPromise = _interopRequireDefault(require("mkdirp-promise"));

const vision = require('@google-cloud/vision');

const CONFIDENCE_SPECTRE = 0.4;
const arrayWordToString = (0, _ramda.join)('');
/**
 * @description converts milliseconds to INE's date format
 * @param ms
 * @returns {string}
 */

const getDateFromMS = ms => (0, _moment.default)(new Date(ms * 1)).format('DD/MM/YYYY');

const search = (0, _ramda.curry)((regex, str) => str.search(regex));
const match = (0, _ramda.curry)((regex, str) => str.match(regex));
/**
 * @description format data to match with image
 * @type {array}
 */

const INE_A_PROPERTIES = [{
  value: 'apellidoPaterno',
  transform: _ramda.toUpper
}, {
  value: 'apellidoMaterno',
  transform: _ramda.toUpper
}, {
  value: 'nombre',
  transform: _ramda.toUpper
}, {
  value: 'curp',
  transform: _ramda.toUpper
}, {
  value: 'fecha',
  transform: getDateFromMS
}];
/**
 * @description format data to match with image
 * @type {array}
 */

const INE_R_PROPERTIES = [{
  value: 'apellidoPaterno',
  transform: _ramda.toUpper
}, {
  value: 'apellidoMaterno',
  transform: _ramda.toUpper
}, {
  value: 'nombre',
  transform: _ramda.toUpper
}];
/**
 * @description format data to match with image
 * @type {array}
 */

const CD_PROPERTIES = [{
  value: 'calle',
  transform: _ramda.toUpper
}, {
  value: 'colonia',
  transform: _ramda.toUpper
}, {
  value: 'codigoPostal',
  transform: _ramda.toUpper
}, {
  value: 'apellidoPaterno',
  transform: _ramda.toUpper
}, {
  value: 'apellidoMaterno',
  transform: _ramda.toUpper
}, {
  value: 'nombre',
  transform: _ramda.toUpper
}, {
  value: 'estado',
  transform: _ramda.toUpper
}, {
  value: 'municipio',
  transform: _ramda.toUpper
}];
/**
 * @description Creates a new {ImageAnnotatorClient} client
 * @type {v1.ImageAnnotatorClient|ImageAnnotatorClient}
 */

const VisionClient = new vision.ImageAnnotatorClient();
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
 * @param imageBuffer
 * @returns {Promise<*>}
 */


const getImageAndRequest = async path => {
  const results = await VisionClient.documentTextDetection({
    image: {
      filename: path
    }
  });
  console.log(results);
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
 * @description main function
 * @returns {Promise<Response>}
 */


var _default = (firebase, config) => async object => {
  const {
    name,
    bucket
  } = object;
  console.log(object);
  const storage = firebase.storage().bucket(bucket);
  const database = (0, _firebase.default)(firebase);

  try {
    /**
     * BEFORE EVERYTHING STARTS
     */
    const path = (0, _path.dirname)(name);
    const fileName = (0, _path.basename)(name, (0, _path.extname)(name));
    if ((0, _ramda.head)(path.split('/')) !== (config.responsePath || 'documents')) return null;
    if (fileName !== 'INEA' && fileName !== 'INER' && fileName !== 'CD') return null;
    const [, uId] = path.split('/');
    const userData = await database.fetch(`/fisa_renewals/${uId}`);

    if (!userData.nombre) {
      await database.update(`/fisa_documents/${uId}`, {
        [fileName]: 0
      });
      console.log('USUARIO INEXISTENTE');
      return null;
    }
    /**
     * @var getAndTransform
     * @type function(*): {object}
     */


    const getAndTransform = getDataToMatch(userData);
    /**
     * @var propertiesByType
     * @description Gets the properties to evaluate for this type of image
     * @type object[]
     */

    const propertiesByType = fileName === 'INEA' ? INE_A_PROPERTIES : fileName === 'INER' ? INE_R_PROPERTIES : fileName === 'CD' ? CD_PROPERTIES : [];
    /**
     * @constant dataToUse
     * @type {object}
     */

    const wordToMatch = getAndTransform(propertiesByType);
    const tempPath = (0, _path.join)((0, _os.tmpdir)(), name);
    await (0, _mkdirpPromise.default)((0, _path.dirname)(tempPath));
    await storage.file(name).download({
      destination: tempPath
    });
    const visionResult = await getImageAndRequest(tempPath);

    if (!visionResult.message) {
      await database.update(`/fisa_documents/${uId}`, {
        [fileName]: 0
      });
      console.log('SIN RESULTADOS DE VISION', visionResult.message);
      return null;
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
    /**
     * @description filter, order and compare all the words found from Vision API and get a confidence percentage
     * @type {Function}
     * @returns {number}
     */

    const getResult = (0, _ramda.compose)(compareWords(wordToMatch), getWords);
    await database.update(`/fisa_documents/${uId}/${fileName}`, getResult(blocks));
    return null;
  } catch (err) {
    console.error(err);
  }
};

exports.default = _default;