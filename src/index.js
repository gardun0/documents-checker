import Triggers from '@triggers'
import * as functions from 'firebase-functions'
import forceSlash from '@utils/forceSlash'
import ensureCors from './utils/ensureCors'

/*
* EXPORT ALL THE FUNCTIONS
*/

export const RequestRegister = functions.https.onRequest(forceSlash(ensureCors(Triggers.requestRegister)))
