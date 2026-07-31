import { apiProvider } from '../api/index.js'

const BUSINESSES_STORAGE_KEY = 'bb_businesses'
const BUSINESS_DATA_STORAGE_KEY = 'bb_business_data'
const NOTIFICATIONS_STORAGE_KEY = 'bb_notifications'
const CUSTOMER_STORAGE_KEY = 'bb_pos_customers'
const AUTH_OVERRIDE_STORAGE_KEY = 'bb_auth_overrides'

const WORKSPACE_SYNC_KEYS = [
  BUSINESSES_STORAGE_KEY,
  BUSINESS_DATA_STORAGE_KEY,
  NOTIFICATIONS_STORAGE_KEY,
  CUSTOMER_STORAGE_KEY,
  AUTH_OVERRIDE_STORAGE_KEY,
  'activeBusinessId',
  'activeBusinessName',
  'currentUser',
  'userName',
]

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return clone(fallback)
    const parsed = JSON.parse(raw)
    return parsed ?? clone(fallback)
  } catch {
    return clone(fallback)
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeBusinessRecord(record) {
  return {
    id: String(record?.id || '').trim(),
    name: String(record?.name || 'Untitled Business').trim() || 'Untitled Business',
    owner: String(record?.owner || 'Unknown Owner').trim() || 'Unknown Owner',
    adminName: String(record?.adminName || 'Unassigned').trim() || 'Unassigned',
    type: String(record?.type || 'Retail').trim() || 'Retail',
    email: String(record?.email || '').trim(),
    phone: String(record?.phone || '').trim(),
    status: String(record?.status || 'Active').trim() || 'Active',
    productsPlan: String(record?.productsPlan || record?.type || 'Core POS').trim() || 'Core POS',
    tenureMonths: Number(record?.tenureMonths || 0),
    storesCount: Number(record?.storesCount || 0),
    profit: Number(record?.profit || 0),
    paymentDue: Number(record?.paymentDue || 0),
    users: Array.isArray(record?.users) ? record.users.map((item) => normalizeTeamMember(item)) : [],
    stores: Array.isArray(record?.stores) ? record.stores.map((item) => normalizeStore(item)) : [],
    payments: Array.isArray(record?.payments)
      ? record.payments.map((item) => normalizePaymentRecord(item))
      : [],
  }
}

function normalizeTeamMember(record) {
  return {
    username: String(record?.username || record?.name || '').trim().toLowerCase().replace(/\s+/g, ''),
    name: String(record?.name || 'Unnamed User').trim() || 'Unnamed User',
    email: String(record?.email || '').trim(),
    role: String(record?.role || 'Cashier').trim() || 'Cashier',
    status: String(record?.status || 'Active').trim() || 'Active',
  }
}

function normalizeStore(record) {
  return {
    code: String(record?.code || '').trim(),
    city: String(record?.city || '').trim(),
    status: String(record?.status || 'Active').trim() || 'Active',
  }
}

function normalizePaymentRecord(record) {
  return {
    month: String(record?.month || '').trim(),
    amount: Number(record?.amount || 0),
    status: String(record?.status || 'Paid').trim() || 'Paid',
  }
}

function normalizeOrderRecord(order) {
  return {
    id: String(order?.id || '').trim(),
    customer: String(order?.customer || 'Walk-in').trim() || 'Walk-in',
    items: Number(order?.items || 1),
    total: Number(order?.total || 0),
    payment: String(order?.payment || order?.paymentMethod || 'Pending').trim() || 'Pending',
    status: String(order?.status || 'Pending').trim() || 'Pending',
    date: String(order?.date || formatTimestamp()).trim() || formatTimestamp(),
    phone: String(order?.phone || '').trim(),
    email: String(order?.email || '').trim(),
    address: String(order?.address || '').trim(),
    notes: String(order?.notes || '').trim(),
    deliveryOption: String(order?.deliveryOption || 'pickup').trim() || 'pickup',
    deliveryPartner: String(order?.deliveryPartner || '').trim(),
    deliveryPartnerPhone: String(order?.deliveryPartnerPhone || '').trim(),
  }
}

function normalizeInventoryRecord(item) {
  return {
    sku: String(item?.sku || '').trim(),
    name: String(item?.name || 'Unnamed Item').trim() || 'Unnamed Item',
    cat: String(item?.cat || item?.category || 'General').trim() || 'General',
    supplier: String(item?.supplier || 'Unassigned').trim() || 'Unassigned',
    stock: Number(item?.stock || 0),
    price: Number(item?.price || 0),
    status: String(item?.status || deriveInventoryStatus(item?.stock)).trim() || 'In Stock',
  }
}

function normalizeDeliveryRecord(item) {
  return {
    id: String(item?.id || '').trim(),
    oid: String(item?.oid || '').trim(),
    customer: String(item?.customer || '').trim(),
    address: String(item?.address || '').trim(),
    partner: String(item?.partner || '').trim(),
    partnerPhone: String(item?.partnerPhone || '').trim(),
    status: String(item?.status || 'Pending').trim() || 'Pending',
    etaMin: item?.etaMin === null || typeof item?.etaMin === 'undefined' ? null : Number(item.etaMin),
    time: String(item?.time || '').trim(),
    updatedAt: String(item?.updatedAt || item?.time || formatTimestamp()).trim() || formatTimestamp(),
  }
}

function normalizeReturnRecord(item) {
  return {
    id: String(item?.id || '').trim(),
    oid: String(item?.oid || '').trim(),
    reason: String(item?.reason || 'Return requested').trim() || 'Return requested',
    amount: Number(item?.amount || 0),
    status: String(item?.status || 'Pending').trim() || 'Pending',
    requestedBy: String(item?.requestedBy || 'Customer').trim() || 'Customer',
    updatedAt: String(item?.updatedAt || formatTimestamp()).trim() || formatTimestamp(),
  }
}

function normalizeBusinessDataMap(map) {
  const input = map && typeof map === 'object' ? map : {}
  return Object.fromEntries(
    Object.entries(input).map(([businessId, data]) => [
      businessId,
      {
        orders: Array.isArray(data?.orders) ? data.orders.map((item) => normalizeOrderRecord(item)) : [],
        inventory: Array.isArray(data?.inventory)
          ? data.inventory.map((item) => normalizeInventoryRecord(item))
          : [],
        deliveries: Array.isArray(data?.deliveries)
          ? data.deliveries.map((item) => normalizeDeliveryRecord(item))
          : [],
        returns: Array.isArray(data?.returns) ? data.returns.map((item) => normalizeReturnRecord(item)) : [],
        users: Array.isArray(data?.users) ? data.users.map((item) => normalizeTeamMember(item)) : [],
      },
    ]),
  )
}

function normalizeNotificationRecord(record) {
  return {
    id: String(record?.id || '').trim(),
    title: String(record?.title || 'Untitled Notification').trim() || 'Untitled Notification',
    type: String(record?.type || record?.category || 'general').trim() || 'general',
    category: String(record?.category || record?.type || 'general').trim() || 'general',
    time: String(record?.time || formatTimestamp()).trim() || formatTimestamp(),
    desc: String(record?.desc || '').trim(),
    color: String(record?.color || 'blue').trim() || 'blue',
    iconKey: String(record?.iconKey || record?.type || 'alert').trim() || 'alert',
    unread: Boolean(record?.unread),
    priority: String(record?.priority || 'medium').trim() || 'medium',
    changes: Array.isArray(record?.changes) ? record.changes : [],
    detailRows: Array.isArray(record?.detailRows) ? record.detailRows : [],
    scopeBusinessId: String(record?.scopeBusinessId || '').trim(),
  }
}

function normalizeCustomersMap(map) {
  const input = map && typeof map === 'object' && !Array.isArray(map) ? map : {}
  return Object.fromEntries(
    Object.entries(input).map(([phone, customer]) => [
      String(phone).trim(),
      {
        phone: String(customer?.phone || phone).trim(),
        name: String(customer?.name || '').trim(),
        email: String(customer?.email || '').trim(),
        address: String(customer?.address || '').trim(),
        notes: String(customer?.notes || '').trim(),
        preferredDeliveryOption: String(customer?.preferredDeliveryOption || 'pickup').trim() || 'pickup',
        deliveryPartner: String(customer?.deliveryPartner || '').trim(),
        deliveryPartnerPhone: String(customer?.deliveryPartnerPhone || '').trim(),
        lastOrderId: String(customer?.lastOrderId || '').trim(),
        lastOrderAt: String(customer?.lastOrderAt || '').trim(),
        orderCount: Number(customer?.orderCount || 0),
      },
    ]),
  )
}

export function createEmptyBusinessData() {
  return {
    orders: [],
    inventory: [],
    deliveries: [],
    returns: [],
    users: [],
  }
}

function ensureBusinessDataEntries(businesses, dataByBusiness) {
  const next = { ...dataByBusiness }
  businesses.forEach((business) => {
    if (!next[business.id]) next[business.id] = createEmptyBusinessData()
  })
  return normalizeBusinessDataMap(next)
}

async function seedBusinesses() {
  const stored = readJson(BUSINESSES_STORAGE_KEY, [])
  if (Array.isArray(stored) && stored.length) {
    return stored.map((item) => normalizeBusinessRecord(item))
  }

  const seeded = await apiProvider.getBusinesses()
  const normalized = Array.isArray(seeded)
    ? seeded.map((item) => normalizeBusinessRecord(item))
    : []
  writeJson(BUSINESSES_STORAGE_KEY, normalized)
  return normalized
}

async function seedBusinessData() {
  const stored = readJson(BUSINESS_DATA_STORAGE_KEY, null)
  if (stored && typeof stored === 'object' && !Array.isArray(stored) && Object.keys(stored).length) {
    return normalizeBusinessDataMap(stored)
  }

  const seeded = await apiProvider.getBusinessData()
  const normalized = normalizeBusinessDataMap(seeded)
  writeJson(BUSINESS_DATA_STORAGE_KEY, normalized)
  return normalized
}

async function seedNotifications() {
  const stored = readJson(NOTIFICATIONS_STORAGE_KEY, [])
  if (Array.isArray(stored) && stored.length) {
    return stored.map((item) => normalizeNotificationRecord(item))
  }

  const response = await fetch('/data/notifications.json', { cache: 'no-store' })
  const seeded = response.ok ? await response.json() : []
  const normalized = Array.isArray(seeded)
    ? seeded.map((item) => normalizeNotificationRecord(item))
    : []
  writeJson(NOTIFICATIONS_STORAGE_KEY, normalized)
  return normalized
}

async function seedCashierData() {
  const response = await fetch('/data/cashier_data.json', { cache: 'no-store' })
  if (!response.ok) {
    return { catalog: [], promos: {}, settings: { deliveryCharge: 0 } }
  }

  const parsed = await response.json()
  return {
    catalog: Array.isArray(parsed?.catalog) ? parsed.catalog : [],
    promos: parsed?.promos && typeof parsed.promos === 'object' ? parsed.promos : {},
    settings:
      parsed?.settings && typeof parsed.settings === 'object'
        ? parsed.settings
        : { deliveryCharge: 0 },
  }
}

function resolveActiveBusinessId(businesses) {
  const storedId = String(localStorage.getItem('activeBusinessId') || '').trim()
  const fallbackId = String(businesses[0]?.id || 'BIZ-101').trim()
  const hasStoredBusiness = storedId && businesses.some((business) => business.id === storedId)
  const activeBusinessId = hasStoredBusiness ? storedId : fallbackId

  if (activeBusinessId) {
    localStorage.setItem('activeBusinessId', activeBusinessId)
  }

  const businessName =
    businesses.find((item) => item.id === activeBusinessId)?.name || localStorage.getItem('activeBusinessName') || ''
  if (businessName) {
    localStorage.setItem('activeBusinessName', businessName)
  }

  return activeBusinessId
}

function getSessionNotifications() {
  try {
    const raw = sessionStorage.getItem('bb_customer_session_notifications')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((item) => normalizeNotificationRecord(item)) : []
  } catch {
    return []
  }
}

export function getWorkspaceSyncKeys() {
  return WORKSPACE_SYNC_KEYS
}

export async function loadWorkspaceState() {
  const [businesses, dataByBusiness, notifications, cashierData] = await Promise.all([
    seedBusinesses(),
    seedBusinessData(),
    seedNotifications(),
    seedCashierData(),
  ])

  const normalizedBusinesses = businesses.map((item) => normalizeBusinessRecord(item))
  const normalizedDataByBusiness = ensureBusinessDataEntries(normalizedBusinesses, dataByBusiness)
  const normalizedNotifications = notifications.map((item) => normalizeNotificationRecord(item))
  const activeBusinessId = resolveActiveBusinessId(normalizedBusinesses)
  const activeBusiness =
    normalizedBusinesses.find((item) => item.id === activeBusinessId) || normalizedBusinesses[0] || null
  const currentUser = readJson('currentUser', null)
  const customers = normalizeCustomersMap(readJson(CUSTOMER_STORAGE_KEY, {}))

  writeJson(BUSINESSES_STORAGE_KEY, normalizedBusinesses)
  writeJson(BUSINESS_DATA_STORAGE_KEY, normalizedDataByBusiness)
  writeJson(NOTIFICATIONS_STORAGE_KEY, normalizedNotifications)

  return {
    businesses: normalizedBusinesses,
    dataByBusiness: normalizedDataByBusiness,
    notifications: normalizedNotifications,
    cashierData,
    customers,
    activeBusinessId,
    activeBusiness,
    activeData: activeBusiness ? normalizedDataByBusiness[activeBusiness.id] || createEmptyBusinessData() : createEmptyBusinessData(),
    currentUser,
    sessionNotifications: getSessionNotifications(),
  }
}

export function persistWorkspaceState({ businesses, dataByBusiness, notifications, customers }) {
  if (Array.isArray(businesses)) {
    writeJson(
      BUSINESSES_STORAGE_KEY,
      businesses.map((item) => normalizeBusinessRecord(item)),
    )
  }

  if (dataByBusiness && typeof dataByBusiness === 'object') {
    writeJson(BUSINESS_DATA_STORAGE_KEY, normalizeBusinessDataMap(dataByBusiness))
  }

  if (Array.isArray(notifications)) {
    writeJson(
      NOTIFICATIONS_STORAGE_KEY,
      notifications.map((item) => normalizeNotificationRecord(item)),
    )
  }

  if (customers && typeof customers === 'object') {
    writeJson(CUSTOMER_STORAGE_KEY, normalizeCustomersMap(customers))
  }
}

export function setActiveBusiness(business) {
  const businessId = String(business?.id || '').trim()
  if (!businessId) return
  localStorage.setItem('activeBusinessId', businessId)
  localStorage.setItem('activeBusinessName', String(business?.name || '').trim())
}

export function buildNextId(prefix, rows, seed = 1) {
  const maxValue = (Array.isArray(rows) ? rows : [])
    .map((item) => parseInt(String(item?.id || '').replace(/[^\d]/g, ''), 10))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), seed - 1)

  return `${prefix}-${maxValue + 1}`
}

export function formatCurrency(amount) {
  return `Rs ${Math.max(0, Number(amount || 0)).toLocaleString()}`
}

export function formatTimestamp(date = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${date.getDate()} ${months[date.getMonth()]} ${hours}:${minutes}`
}

export function deriveInventoryStatus(stock) {
  const count = Number(stock || 0)
  if (count <= 0) return 'Out of Stock'
  if (count < 100) return 'Low Stock'
  return 'In Stock'
}

export function getStatusBadgeClass(status) {
  const value = String(status || '').toLowerCase()
  if (value.includes('deliver') || value.includes('approved') || value.includes('paid') || value.includes('active')) {
    return 'b-delivered'
  }
  if (value.includes('process') || value.includes('transit') || value.includes('partial') || value.includes('trial')) {
    return 'b-processing'
  }
  if (value.includes('cancel') || value.includes('suspend') || value.includes('out of stock') || value.includes('due')) {
    return 'b-cancelled'
  }
  if (value.includes('low')) return 'b-pending'
  return 'b-pending'
}

export function getPaymentBadgeClass(payment) {
  const value = String(payment || '').toLowerCase()
  if (value.includes('upi')) return 'b-upi'
  if (value.includes('cash') || value.includes('cod')) return 'b-cash'
  if (value.includes('card') || value.includes('paid')) return 'b-card'
  return 'b-processing'
}

export function buildNotification({
  title,
  desc,
  type = 'general',
  priority = 'medium',
  color = 'blue',
  detailRows = [],
  changes = [],
  scopeBusinessId = '',
}) {
  return normalizeNotificationRecord({
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    desc,
    type,
    category: type,
    priority,
    color,
    iconKey: type,
    unread: true,
    time: formatTimestamp(),
    detailRows,
    changes,
    scopeBusinessId,
  })
}

export function upsertAuthOverride(username, record) {
  const safeUsername = String(username || '').trim().toLowerCase()
  if (!safeUsername) return

  const overrides = readJson(AUTH_OVERRIDE_STORAGE_KEY, {})
  const nextOverrides = {
    ...overrides,
    [safeUsername]: {
      ...(overrides[safeUsername] || {}),
      ...record,
      username: safeUsername,
    },
  }

  writeJson(AUTH_OVERRIDE_STORAGE_KEY, nextOverrides)
}

export function updateStoredCurrentUser(partial) {
  const currentUser = readJson('currentUser', null)
  if (!currentUser || typeof currentUser !== 'object') return
  const nextUser = { ...currentUser, ...partial }
  localStorage.setItem('currentUser', JSON.stringify(nextUser))
  if (partial?.name) {
    localStorage.setItem('userName', String(partial.name).trim())
  }
}
