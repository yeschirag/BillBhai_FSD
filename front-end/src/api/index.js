import { apiConfig } from './config.js'
import { localProvider } from './providers/localProvider.js'
import { remoteProvider } from './providers/remoteProvider.js'

export const apiProvider = apiConfig.mode === 'remote' ? remoteProvider : localProvider
