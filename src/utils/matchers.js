import { toUpper } from 'ramda'
import moment from 'moment'

const getDateFromMS = ms => moment(new Date(ms * 1)).format('DD/MM/YYYY')

const toMatch = {
  CD: [
    { value: 'calle', transform: toUpper },
    { value: 'colonia', transform: toUpper },
    { value: 'codigoPostal', transform: toUpper },
    { value: 'apellidoPaterno', transform: toUpper },
    { value: 'apellidoMaterno', transform: toUpper },
    { value: 'nombre', transform: toUpper },
    { value: 'estado', transform: toUpper },
    { value: 'municipio', transform: toUpper }
  ],
  INER: [
    { value: 'apellidoPaterno', transform: toUpper },
    { value: 'apellidoMaterno', transform: toUpper },
    { value: 'nombre', transform: toUpper }
  ],
  INEA: [
    { value: 'apellidoPaterno', transform: toUpper },
    { value: 'apellidoMaterno', transform: toUpper },
    { value: 'nombre', transform: toUpper },
    { value: 'curp', transform: toUpper },
    { value: 'fecha', transform: getDateFromMS }
  ],
}

export default type => toMatch[type] || null
