const DEFAULT_TIMEOUT_MS = 7000

export const apiConfig = {
  mode: import.meta.env.VITE_API_MODE || 'remote',
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
}
