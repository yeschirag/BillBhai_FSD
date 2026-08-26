import { apiConfig } from './config.js'

function getActiveRole() {
  try {
    const rawUser = localStorage.getItem('currentUser')
    if (rawUser) {
      const user = JSON.parse(rawUser)
      if (user?.role) return String(user.role).trim().toLowerCase().replace(/\s+/g, '')
    }
  } catch {
    // fallback
  }
  return String(localStorage.getItem('userRole') || 'customer').trim().toLowerCase().replace(/\s+/g, '')
}

export async function request(path, options = {}) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timeoutMs = Number(options.timeoutMs || apiConfig.timeoutMs || 7000)
  const method = options.method || 'GET'
  const activeRole = options.role || getActiveRole()
  const authToken = localStorage.getItem('authToken') || ''
  const headers = {
    'Content-Type': 'application/json',
    'x-role': activeRole,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  }

  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      if (controller) controller.abort()
      reject(new Error('Request timed out'))
    }, timeoutMs)
  })

  const url = `${apiConfig.baseUrl}${path}`

  try {
    const response = await Promise.race([
      fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller ? controller.signal : undefined,
      }),
      timeoutPromise,
    ])

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: typeof payload === 'string' ? payload : payload?.message || 'Request failed',
      }
    }

    return { ok: true, status: response.status, data: payload }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}
