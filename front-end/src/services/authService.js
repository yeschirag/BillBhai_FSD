import { apiConfig } from '../api/config.js'
import { apiProvider } from '../api/index.js'

const AUTH_OVERRIDE_STORAGE_KEY = 'bb_auth_overrides'
const DEFAULT_BUSINESS_ID = 'BIZ-101'

export const ALL_OPERATION_ROLES = [
  'superuser',
  'admin',
  'cashier',
  'returnhandler',
  'inventorymanager',
  'deliveryops',
  'customer',
]

export const ADMIN_AND_ABOVE_ROLES = ['superuser', 'admin']

const DEFAULT_AUTH_CONFIG = {
  users: {
    superuser: { password: 'super123', role: 'Super User', name: 'Legacy Admin Account' },
    admin: { password: 'admin123', role: 'Admin', name: 'Store Admin' },
    cashier: { password: 'cashier123', role: 'Cashier', name: 'POS Cashier' },
    returnhandler: { password: 'return123', role: 'Return Handler', name: 'Returns Desk' },
    inventorymanager: { password: 'inventory123', role: 'Inventory Manager', name: 'Inventory Lead' },
    deliveryops: { password: 'delivery123', role: 'Delivery Ops', name: 'Delivery Manager' },
    customer: { password: 'customer123', role: 'Customer', name: 'Self Checkout User' },
    chirag: { password: 'chirag1234', role: 'Super User', name: 'Chirag' },
  },
  aliases: {
    super: 'superuser',
    'superuser@billbhai.com': 'superuser',
    'admin@billbhai.com': 'admin',
    'cashier@billbhai.com': 'cashier',
    returns: 'returnhandler',
    'returnhandler@billbhai.com': 'returnhandler',
    inventory: 'inventorymanager',
    'inventorymanager@billbhai.com': 'inventorymanager',
    delivery: 'deliveryops',
    'deliveryops@billbhai.com': 'deliveryops',
    user: 'customer',
    'customer@billbhai.com': 'customer',
    'chirag@billbhai.com': 'chirag',
  },
}

let authConfig = {
  users: { ...DEFAULT_AUTH_CONFIG.users },
  aliases: { ...DEFAULT_AUTH_CONFIG.aliases },
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().replace(/\s+/g, '')
}

export function roleToKey(role) {
  const value = normalizeRole(role)
  if (value === 'superuser' || value === 'super') return 'superuser'
  if (
    value === 'admin' ||
    value === 'opshead' ||
    value === 'storemanager' ||
    value === 'accountant' ||
    value === 'supportagent'
  ) {
    return 'admin'
  }
  if (value === 'cashier') return 'cashier'
  if (value === 'returnhandler' || value === 'returns') return 'returnhandler'
  if (value === 'inventorymanager' || value === 'inventory') return 'inventorymanager'
  if (
    value === 'deliveryops' ||
    value === 'deliverymanager' ||
    value === 'delivery' ||
    value === 'deliverydriver'
  ) {
    return 'deliveryops'
  }
  if (value === 'customer' || value === 'user') return 'customer'
  return 'admin'
}

export function routeByRolePath(role) {
  const key = roleToKey(role)
  if (key === 'superuser') return '/superuser'
  if (key === 'admin') return '/dashboard'
  if (key === 'cashier') return '/cashier'
  if (key === 'returnhandler') return '/returns'
  if (key === 'inventorymanager') return '/inventory'
  if (key === 'deliveryops') return '/delivery'
  if (key === 'customer') return '/cashier'
  return '/dashboard'
}

function loadAuthOverrides() {
  try {
    const raw = localStorage.getItem(AUTH_OVERRIDE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function resolveUserRecord(userKey) {
  const overrides = loadAuthOverrides()
  const hasBaseRecord = Object.prototype.hasOwnProperty.call(authConfig.users, userKey)
  const baseRecord = hasBaseRecord ? authConfig.users[userKey] || {} : {}
  const overrideRecord =
    overrides[userKey] && typeof overrides[userKey] === 'object' ? overrides[userKey] : {}

  if (!hasBaseRecord && !Object.keys(overrideRecord).length) return null

  return {
    ...baseRecord,
    ...overrideRecord,
    role: String(overrideRecord.role || baseRecord.role || 'Customer').trim(),
    name: String(overrideRecord.name || baseRecord.name || userKey).trim() || userKey,
    status: String(overrideRecord.status || baseRecord.status || 'Active').trim() || 'Active',
    password: String(overrideRecord.password || baseRecord.password || '').trim(),
    username: String(overrideRecord.username || userKey).trim() || userKey,
  }
}

function resolveUserKey(input) {
  const normalized = String(input || '').trim().toLowerCase()
  if (!normalized) return ''

  if (Object.prototype.hasOwnProperty.call(authConfig.users, normalized)) {
    return normalized
  }

  const aliasMatch = authConfig.aliases[normalized]
  if (aliasMatch) return aliasMatch

  const overrides = loadAuthOverrides()
  if (Object.prototype.hasOwnProperty.call(overrides, normalized)) {
    return normalized
  }

  const dynamicMatch = Object.keys(overrides).find((key) => {
    const record = overrides[key] && typeof overrides[key] === 'object' ? overrides[key] : {}
    const username = String(record.username || '').trim().toLowerCase()
    const email = String(record.email || '').trim().toLowerCase()
    return username === normalized || email === normalized
  })

  return dynamicMatch || ''
}

async function loadAuthConfig() {
  const parsed = await apiProvider.getAuthConfig()

  if (!parsed || typeof parsed !== 'object') {
    authConfig = {
      users: { ...DEFAULT_AUTH_CONFIG.users },
      aliases: { ...DEFAULT_AUTH_CONFIG.aliases },
    }
    return
  }

  const users =
    parsed.users && typeof parsed.users === 'object' && !Array.isArray(parsed.users)
      ? parsed.users
      : DEFAULT_AUTH_CONFIG.users

  const aliases =
    parsed.aliases && typeof parsed.aliases === 'object' && !Array.isArray(parsed.aliases)
      ? parsed.aliases
      : DEFAULT_AUTH_CONFIG.aliases

  authConfig = {
    users: { ...users },
    aliases: { ...aliases },
  }
}

async function resolveScopedBusinessId() {
  const currentScopedId = String(localStorage.getItem('activeBusinessId') || '').trim()

  try {
    const raw = localStorage.getItem('bb_businesses')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        const businessIds = parsed.map((item) => String(item && item.id || '').trim()).filter(Boolean)
        if (currentScopedId && businessIds.includes(currentScopedId)) return currentScopedId
        if (businessIds.length) return businessIds[0]
      }
    }
  } catch {
    // ignore parse fallback and use seed json
  }

  const businesses = await apiProvider.getBusinesses()
  if (Array.isArray(businesses) && businesses.length) {
    const businessIds = businesses.map((item) => String(item && item.id || '').trim()).filter(Boolean)
    if (currentScopedId && businessIds.includes(currentScopedId)) return currentScopedId
    if (businessIds.length) return businessIds[0]
  }

  return currentScopedId || DEFAULT_BUSINESS_ID
}

export function getStoredCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const username = String(parsed.username || '').trim()
    const name = String(parsed.name || '').trim()
    const role = roleToKey(parsed.role)
    const companyId = String(parsed.companyId || '').trim()

    if (!username || !name) return null
    return { username, name, role, companyId: companyId || undefined }
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem('userRole')
  localStorage.removeItem('userName')
  localStorage.removeItem('currentUser')
  localStorage.removeItem('activeBusinessId')
  localStorage.removeItem('activeBusinessName')
  sessionStorage.removeItem('bb_customer_session_id')
  sessionStorage.removeItem('bb_customer_session_notifications')
}

export async function authenticateUser(identity, password) {
  if (apiConfig.mode === 'remote') {
    const resolvedUsername = resolveUserKey(identity) || identity
    const remoteLoginResponse = await apiProvider.login({ username: resolvedUsername, password })
    if (remoteLoginResponse && remoteLoginResponse.ok && remoteLoginResponse.data) {
      const remoteUser = remoteLoginResponse.data.user || remoteLoginResponse.data
      const normalizedRole = roleToKey(remoteUser.role)
      const currentUser = {
        username: String(remoteUser.username || resolvedUsername).trim(),
        name: String(remoteUser.name || remoteUser.username || resolvedUsername).trim(),
        role: normalizedRole,
        companyId: String(remoteUser.companyId || '').trim() || undefined,
      }

      localStorage.setItem('userRole', normalizedRole)
      localStorage.setItem('userName', currentUser.name)
      localStorage.setItem('currentUser', JSON.stringify(currentUser))
      if (remoteUser.companyId) {
        localStorage.setItem('activeBusinessId', remoteUser.companyId)
      } else {
        localStorage.setItem('activeBusinessId', 'BIZ-101')
      }

      return {
        ok: true,
        user: currentUser,
        redirectPath: routeByRolePath(normalizedRole),
      }
    }
  }

  await loadAuthConfig()

  const userKey = resolveUserKey(identity)
  const userRecord = resolveUserRecord(userKey)

  if (!userKey || !userRecord || userRecord.password !== String(password || '').trim()) {
    return { ok: false, error: 'Incorrect username or password.' }
  }

  const accountStatus = normalizeRole(userRecord.status || 'active')
  if (accountStatus === 'suspended' || accountStatus === 'inactive') {
    return {
      ok: false,
      error: 'This account is currently suspended. Contact an administrator.',
    }
  }

  const normalizedRole = roleToKey(userRecord.role)

  localStorage.setItem('userRole', userRecord.role)
  localStorage.setItem('userName', userRecord.name)

  const businessScopedRoles = [
    'admin',
    'cashier',
    'inventorymanager',
    'deliveryops',
    'returnhandler',
    'customer',
  ]

  if (businessScopedRoles.includes(normalizedRole)) {
    localStorage.setItem('activeBusinessId', await resolveScopedBusinessId())
    localStorage.removeItem('activeBusinessName')
  } else {
    localStorage.removeItem('activeBusinessId')
    localStorage.removeItem('activeBusinessName')
  }

  const currentUser = {
    username: userKey,
    name: userRecord.name,
    role: normalizedRole,
    companyId: normalizedRole === 'superuser' ? undefined : await resolveScopedBusinessId(),
  }

  localStorage.setItem('currentUser', JSON.stringify(currentUser))

  if (normalizedRole === 'customer') {
    sessionStorage.setItem(
      'bb_customer_session_id',
      `customer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    )
    sessionStorage.setItem('bb_customer_session_notifications', '[]')
  } else {
    sessionStorage.removeItem('bb_customer_session_id')
    sessionStorage.removeItem('bb_customer_session_notifications')
  }

  return {
    ok: true,
    user: currentUser,
    redirectPath: routeByRolePath(normalizedRole),
  }
}
