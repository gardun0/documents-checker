import { errorResponse, successResponse } from '@utils/helpers'
import { $fetch, $update } from '@utils/firebase'
import PATHS from '@utils/paths'
import sha1FromString from 'sha1'

module.exports = async (req, res) => {
  const { method, body } = req

  const { header, solicitudCredito, cliente, imagenes } = body

  try {
    if (method !== 'POST') return res.status(405).send(errorResponse(405, 'BAD_METHOD', 'Metodo no permitido, esperado POST'))

    if (!solicitudCredito || !imagenes) return res.status(400).send(errorResponse(400, 'MISSING_PROPERTIES', 'Faltan parametros requeridos'))

    return res.status(200).send(successResponse(200, 'Usuario creado'))
  } catch (err) {
    return res.status(500).send(errorResponse(500, 'INTERNAL_ERROR', err.message))
  }
}
