const DEFAULT_TIMEOUT_MS = 7000

export const apiConfig = {
  mode: import.meta.env.VITE_API_MODE || 'remote',
  baseUrl: (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://billbhai-fsd.onrender.com').replace(/\/+$/, '').replace(/\/api$/, '') + '/api',
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
}
