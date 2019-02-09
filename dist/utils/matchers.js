"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ramda = require("ramda");

var _verifyDocument = _interopRequireDefault(require("../triggers/verifyDocument.legacy"));

const getDateFromMS = ms => (0, _verifyDocument.default)(new Date(ms * 1)).format('DD/MM/YYYY');

const toMatch = {
  CD: [{
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
  }],
  INER: [{
    value: 'apellidoPaterno',
    transform: _ramda.toUpper
  }, {
    value: 'apellidoMaterno',
    transform: _ramda.toUpper
  }, {
    value: 'nombre',
    transform: _ramda.toUpper
  }],
  INEA: [{
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
  }]
};

var _default = type => toMatch[type] || null;

exports.default = _default;