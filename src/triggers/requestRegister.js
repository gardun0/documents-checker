// import { errorResponse, successResponse } from '@utils/helpers'
// import * as imageURI from 'image-data-uri'
// import mime from 'mime-types'
// import moment from 'moment'
// import { $fetch, $update } from '@utils/firebase'
// import firebase from '@firebase'
// import PATHS from '@utils/paths'
// import { optionalProperty } from '../utils/helpers'
// import DataStore from '@google-cloud/datastore'
// import { resolve } from 'path'
//
// const DataStoreClient = DataStore({
//   projectId: 'fintech-movil-desarrollo'
// })
//
// const bucketStorage = firebase.storage().bucket()
//
// const transformAndUpdateImage = async (file, root, idSolicitud, idPersona) => {
//   const imageData = imageURI.decode(file)
//
//   const fileName = `${idSolicitud}_${idPersona}.${mime.extension(imageData.imageType)}`
//
//   await bucketStorage
//     .file(`${root}/${fileName}`)
//     .save(imageData.dataBuffer)
//
//   const [ downloadURL ] = await bucketStorage.file(`${root}/${fileName}`).getSignedUrl({
//     action: 'read',
//     expires: moment().add(2, 'years').toDate().getTime(),
//     responseType: imageData.imageType
//   })
//
//   return {
//     fileName,
//     downloadURL
//   }
// }
//
// module.exports = async (req, res) => {
//   const { method, body } = req
//
//   const { header, solicitudCredito, cliente, imagenes } = body
//
//   try {
//     const myKey = DataStoreClient.key(['Results', 'Success'])
//
//     DataStoreClient.save({
//       key: myKey,
//       data: {
//         1: 1,
//         2: 2
//       }
//     }, (err, res) => {
//       console.log(res)
//       if (err) throw err
//     })
//   } catch (err) {
//     return res.status(500).send(errorResponse(500, 'INTERNAL_ERROR', err.message))
//   }
// }
