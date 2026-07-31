import { apiConfig } from '../config.js'

async function fetchJsonWithTimeout(path) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const requestOptions = { cache: 'no-store' }
  if (controller) requestOptions.signal = controller.signal

  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      if (controller) controller.abort()
      reject(new Error('Request timed out'))
    }, apiConfig.timeoutMs)
  })

  try {
    const response = await Promise.race([fetch(path, requestOptions), timeoutPromise])
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const localProvider = {
  async getAuthConfig() {
    return await fetchJsonWithTimeout('/data/auth_users.json')
  },
  async getBusinesses() {
    return await fetchJsonWithTimeout('/data/businesses.json')
  },
  async getBusinessData() {
    return await fetchJsonWithTimeout('/data/business_data.json')
  },
  async login() {
    // In local mode login is handled in authService using seed config and local overrides.
    return null
  },
}
