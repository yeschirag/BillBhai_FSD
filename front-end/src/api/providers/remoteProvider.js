import { request } from '../httpClient.js'
import { localProvider } from './localProvider.js'

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function getCurrentRole() {
  const role = String(getCurrentUser()?.role || localStorage.getItem('userRole') || 'customer')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  return role || 'customer'
}

function getCurrentCompanyId() {
  const userCompanyId = String(getCurrentUser()?.companyId || '').trim()
  if (userCompanyId) return userCompanyId
  return String(localStorage.getItem('activeBusinessId') || '').trim()
}

function normalizeList(response, normalizer) {
  return Array.isArray(response) ? response.map((item) => normalizer(item)).filter(Boolean) : null
}

function normalizeCompanyRecord(record) {
  return {
    id: String(record?.id || '').trim(),
    name: String(record?.name || 'Untitled Business').trim() || 'Untitled Business',
    owner: String(record?.owner || 'Unknown Owner').trim() || 'Unknown Owner',
    adminName: String(record?.adminName || 'Unassigned').trim() || 'Unassigned',
    type: String(record?.type || 'Retail').trim() || 'Retail',
    email: String(record?.email || '').trim(),
    phone: String(record?.phone || record?.mobileNo || '').trim(),
    status: String(record?.status || 'Active').trim() || 'Active',
    productsPlan: String(record?.productsPlan || record?.type || 'Core POS').trim() || 'Core POS',
    tenureMonths: Number(record?.tenureMonths || 0),
    storesCount: Number(record?.storesCount || 0),
    profit: Number(record?.profit || 0),
    paymentDue: Number(record?.paymentDue || 0),
    users: Array.isArray(record?.users) ? record.users.map((item) => normalizeUserRecord(item)) : [],
    stores: Array.isArray(record?.stores) ? record.stores : [],
    payments: Array.isArray(record?.payments) ? record.payments : [],
  }
}

function normalizeUserRecord(record) {
  return {
    id: String(record?.id || '').trim(),
    companyId: String(record?.companyId || '').trim(),
    username: String(record?.username || record?.name || '').trim().toLowerCase().replace(/\s+/g, ''),
    name: String(record?.name || 'Unnamed User').trim() || 'Unnamed User',
    email: String(record?.email || '').trim(),
    phone: String(record?.phone || record?.mobileNo || '').trim(),
    role: String(record?.role || 'Cashier').trim() || 'Cashier',
    status: String(record?.status || 'Active').trim() || 'Active',
  }
}

function normalizeCustomerRecord(record) {
  return {
    id: String(record?.id || '').trim(),
    companyId: String(record?.companyId || '').trim(),
    phone: String(record?.phone || record?.mobileNo || '').trim(),
    name: String(record?.name || '').trim(),
    email: String(record?.email || '').trim(),
    address: String(record?.address || '').trim(),
    notes: String(record?.notes || '').trim(),
  }
}

function normalizeProductRecord(record) {
  return {
    id: String(record?.id || '').trim(),
    supplierId: String(record?.supplierId || '').trim(),
    name: String(record?.name || 'Unnamed Product').trim() || 'Unnamed Product',
    category: String(record?.category || 'General').trim() || 'General',
    barcode: String(record?.barcode || '').trim(),
    price: Number(record?.price || 0),
    size: String(record?.size || '').trim(),
    description: String(record?.description || '').trim(),
    companyId: String(record?.companyId || '').trim(),
  }
}

function normalizeInventoryRecord(record, productMap = {}) {
  const productId = String(record?.productId || record?.id || record?.sku || '').trim()
  const product = productMap[productId] || null
  const stock = Number(record?.stockAvailable ?? record?.stock ?? 0)

  return {
    sku: String(record?.id || productId).trim(),
    productId,
    name: String(record?.name || product?.name || productId || 'Unnamed Item').trim() || 'Unnamed Item',
    cat: String(record?.cat || record?.category || product?.category || 'General').trim() || 'General',
    supplier: String(record?.supplier || product?.supplierId || 'Unassigned').trim() || 'Unassigned',
    stock,
    price: Number(record?.price || product?.price || 0),
    status: String(record?.status || '').trim() || (stock <= 0 ? 'Out of Stock' : stock < 100 ? 'Low Stock' : 'In Stock'),
    reorderLevel: Number(record?.reorderLevel || 0),
    location: String(record?.location || '').trim(),
    lastUpdated: String(record?.lastUpdated || '').trim(),
    companyId: String(record?.companyId || '').trim(),
  }
}

function normalizeOrderRecord(record) {
  const items = Array.isArray(record?.items) ? record.items : []
  return {
    id: String(record?.id || '').trim(),
    customer: String(record?.customer || record?.customerName || 'Walk-in').trim() || 'Walk-in',
    items: Number(record?.items || items.length || 1),
    total: Number(record?.total || 0),
    payment: String(record?.payment || record?.paymentMethod || 'Pending').trim() || 'Pending',
    status: String(record?.status || 'Pending').trim() || 'Pending',
    date: String(record?.date || record?.orderDate || '').trim(),
    phone: String(record?.phone || '').trim(),
    email: String(record?.email || '').trim(),
    address: String(record?.address || record?.customerAddress || '').trim(),
    notes: String(record?.notes || '').trim(),
    deliveryOption: String(record?.deliveryOption || record?.orderType || 'pickup').trim() || 'pickup',
    deliveryPartner: String(record?.deliveryPartner || '').trim(),
    deliveryPartnerPhone: String(record?.deliveryPartnerPhone || '').trim(),
    companyId: String(record?.companyId || '').trim(),
  }
}

function normalizeDeliveryRecord(record) {
  return {
    id: String(record?.id || '').trim(),
    oid: String(record?.oid || record?.orderId || '').trim(),
    customer: String(record?.customer || record?.customerName || '').trim(),
    address: String(record?.address || '').trim(),
    partner: String(record?.partner || record?.partnerName || '').trim(),
    partnerPhone: String(record?.partnerPhone || '').trim(),
    status: String(record?.status || 'Pending').trim() || 'Pending',
    etaMin: record?.etaMin === null || typeof record?.etaMin === 'undefined' ? null : Number(record.etaMin),
    time: String(record?.time || record?.dispatchDate || '').trim(),
    updatedAt: String(record?.updatedAt || record?.deliveryDate || record?.dispatchDate || '').trim(),
    companyId: String(record?.companyId || '').trim(),
  }
}

function normalizeReturnRecord(record) {
  return {
    id: String(record?.id || '').trim(),
    oid: String(record?.oid || record?.orderId || '').trim(),
    reason: String(record?.reason || record?.product || 'Return requested').trim() || 'Return requested',
    amount: Number(record?.amount || record?.refundAmount || 0),
    status: String(record?.status || 'Pending').trim() || 'Pending',
    requestedBy: String(record?.requestedBy || 'Customer').trim() || 'Customer',
    updatedAt: String(record?.updatedAt || record?.returnDate || '').trim(),
    companyId: String(record?.companyId || '').trim(),
  }
}

function collectProductsMap(products) {
  return (Array.isArray(products) ? products : []).reduce((acc, product) => {
    const normalized = normalizeProductRecord(product)
    if (normalized.id) {
      acc[normalized.id] = normalized
    }
    return acc
  }, {})
}

function createBusinessMap(companies) {
  const ids = Array.isArray(companies) ? companies.map((item) => String(item?.id || '').trim()).filter(Boolean) : []
  const uniqueIds = ids.length ? ids : [getCurrentCompanyId() || 'BIZ-101']
  return Object.fromEntries(uniqueIds.map((id) => [id, { orders: [], inventory: [], deliveries: [], returns: [], users: [] }]))
}

function getTargetBusinessId(item, fallbackIds) {
  const companyId = String(item?.companyId || '').trim()
  if (companyId) return companyId
  return fallbackIds[0] || getCurrentCompanyId() || 'BIZ-101'
}

async function fetchBusinessFallback() {
  const businesses = await localProvider.getBusinesses()
  return Array.isArray(businesses) ? businesses.map((item) => normalizeCompanyRecord(item)) : []
}

export const remoteProvider = {
  async login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: payload,
    })
  },

  async getAuthConfig() {
    return null
  },

  async getBusinesses() {
    const role = getCurrentRole()
    const companyId = getCurrentCompanyId()

    if (role === 'superuser') {
      const res = await request('/companies', { role: 'superuser' })
      return res.ok ? normalizeList(res.data, normalizeCompanyRecord) : fetchBusinessFallback()
    }

    if (role === 'admin' && companyId) {
      const res = await request(`/companies/${companyId}`, { role: 'admin' })
      if (res.ok && res.data) return [normalizeCompanyRecord(res.data)]
    }

    const fallback = await fetchBusinessFallback()
    if (!companyId) return fallback

    const match = fallback.find((item) => item.id === companyId)
    return match ? [match] : fallback.slice(0, 1)
  },

  async getBusinessData() {
    const role = getCurrentRole()
    const companyId = getCurrentCompanyId()

    const [companies, products, orders, inventory, deliveries, returns, users] = await Promise.all([
      this.getBusinesses(),
      this.getProducts(),
      role === 'superuser' ? this.getOrders() : this.getOrders(companyId || null),
      role === 'superuser' ? this.getInventory() : this.getInventory(),
      role === 'superuser' ? this.getDeliveries() : this.getDeliveries(),
      role === 'superuser' ? this.getReturns() : this.getReturns(),
      role === 'superuser' ? this.getUsers() : this.getUsers(companyId || null),
    ])

    const normalizedCompanies = Array.isArray(companies) && companies.length ? companies : await fetchBusinessFallback()
    const businessIds = normalizedCompanies.map((item) => String(item?.id || '').trim()).filter(Boolean)
    const map = createBusinessMap(normalizedCompanies)
    const productMap = collectProductsMap(products)

    ;(Array.isArray(orders) ? orders : []).forEach((item) => {
      const targetId = getTargetBusinessId(item, businessIds)
      if (!map[targetId]) map[targetId] = { orders: [], inventory: [], deliveries: [], returns: [], users: [] }
      map[targetId].orders.push(normalizeOrderRecord(item))
    })

    ;(Array.isArray(inventory) ? inventory : []).forEach((item) => {
      const targetId = getTargetBusinessId(item, businessIds)
      if (!map[targetId]) map[targetId] = { orders: [], inventory: [], deliveries: [], returns: [], users: [] }
      map[targetId].inventory.push(normalizeInventoryRecord(item, productMap))
    })

    ;(Array.isArray(deliveries) ? deliveries : []).forEach((item) => {
      const targetId = getTargetBusinessId(item, businessIds)
      if (!map[targetId]) map[targetId] = { orders: [], inventory: [], deliveries: [], returns: [], users: [] }
      map[targetId].deliveries.push(normalizeDeliveryRecord(item))
    })

    ;(Array.isArray(returns) ? returns : []).forEach((item) => {
      const targetId = getTargetBusinessId(item, businessIds)
      if (!map[targetId]) map[targetId] = { orders: [], inventory: [], deliveries: [], returns: [], users: [] }
      map[targetId].returns.push(normalizeReturnRecord(item))
    })

    ;(Array.isArray(users) ? users : []).forEach((item) => {
      const targetId = getTargetBusinessId(item, businessIds)
      if (!map[targetId]) map[targetId] = { orders: [], inventory: [], deliveries: [], returns: [], users: [] }
      map[targetId].users.push(normalizeUserRecord(item))
    })

    return map
  },

  async getCompanies() {
    const res = await request('/companies', { role: 'superuser' })
    return res.ok ? normalizeList(res.data, normalizeCompanyRecord) : null
  },

  async getCompany(id) {
    const res = await request(`/companies/${id}`, { role: 'admin' })
    return res.ok ? normalizeCompanyRecord(res.data) : null
  },

  async createCompany(data) {
    return request('/companies', { method: 'POST', body: data, role: 'superuser' })
  },

  async updateCompany(id, data) {
    return request(`/companies/${id}`, { method: 'PUT', body: data, role: 'superuser' })
  },

  async deleteCompany(id) {
    return request(`/companies/${id}`, { method: 'DELETE', role: 'superuser' })
  },

  async getUsers(companyId = null) {
    const path = companyId ? `/users?companyId=${companyId}` : '/users'
    const res = await request(path)
    return res.ok ? normalizeList(res.data, normalizeUserRecord) : null
  },

  async getUser(id) {
    const res = await request(`/users/${id}`)
    return res.ok ? normalizeUserRecord(res.data) : null
  },

  async createUser(data) {
    return request('/users', { method: 'POST', body: data })
  },

  async updateUser(id, data) {
    return request(`/users/${id}`, { method: 'PUT', body: data })
  },

  async deleteUser(id) {
    return request(`/users/${id}`, { method: 'DELETE' })
  },

  async getCustomers(companyId = null) {
    const path = companyId ? `/customers?companyId=${companyId}` : '/customers'
    const res = await request(path)
    return res.ok ? normalizeList(res.data, normalizeCustomerRecord) : null
  },

  async getCustomerByPhone(phone) {
    const res = await request(`/customers/phone/${phone}`)
    return res.ok ? normalizeCustomerRecord(res.data) : null
  },

  async getCustomer(id) {
    const res = await request(`/customers/${id}`)
    return res.ok ? normalizeCustomerRecord(res.data) : null
  },

  async createCustomer(data) {
    return request('/customers', { method: 'POST', body: data })
  },

  async updateCustomer(id, data) {
    return request(`/customers/${id}`, { method: 'PUT', body: data })
  },

  async deleteCustomer(id) {
    return request(`/customers/${id}`, { method: 'DELETE' })
  },

  async getProducts(category = null) {
    const path = category && category !== 'All' ? `/products?category=${encodeURIComponent(category)}` : '/products'
    const res = await request(path)
    return res.ok ? normalizeList(res.data, normalizeProductRecord) : null
  },

  async getProductCategories() {
    const res = await request('/products/categories')
    return res.ok ? res.data : null
  },

  async getProductByBarcode(barcode) {
    const res = await request(`/products/barcode/${barcode}`)
    return res.ok ? normalizeProductRecord(res.data) : null
  },

  async getProduct(id) {
    const res = await request(`/products/${id}`)
    return res.ok ? normalizeProductRecord(res.data) : null
  },

  async createProduct(data) {
    return request('/products', { method: 'POST', body: data })
  },

  async updateProduct(id, data) {
    return request(`/products/${id}`, { method: 'PUT', body: data })
  },

  async deleteProduct(id) {
    return request(`/products/${id}`, { method: 'DELETE' })
  },

  async getInventory() {
    const res = await request('/inventory')
    return res.ok ? normalizeList(res.data, (item) => normalizeInventoryRecord(item, collectProductsMap([]))) : null
  },

  async getLowStockItems() {
    const res = await request('/inventory/low-stock')
    return res.ok ? normalizeList(res.data, normalizeInventoryRecord) : null
  },

  async getInventoryByProduct(productId) {
    const res = await request(`/inventory/product/${productId}`)
    return res.ok ? normalizeInventoryRecord(res.data) : null
  },

  async getInventoryItem(id) {
    const res = await request(`/inventory/${id}`)
    return res.ok ? normalizeInventoryRecord(res.data) : null
  },

  async updateInventory(id, data) {
    return request(`/inventory/${id}`, { method: 'PUT', body: data })
  },

  async adjustStock(data) {
    return request('/inventory/adjust', { method: 'POST', body: data })
  },

  async getOrders(companyId = null) {
    const path = companyId ? `/orders?companyId=${companyId}` : '/orders'
    const res = await request(path)
    return res.ok ? normalizeList(res.data, normalizeOrderRecord) : null
  },

  async getOrder(id) {
    const res = await request(`/orders/${id}`)
    return res.ok ? normalizeOrderRecord(res.data) : null
  },

  async createOrder(data) {
    return request('/orders', { method: 'POST', body: data })
  },

  async updateOrder(id, data) {
    return request(`/orders/${id}`, { method: 'PUT', body: data })
  },

  async deleteOrder(id) {
    return request(`/orders/${id}`, { method: 'DELETE' })
  },

  async validatePromotion(code, subtotal) {
    return request('/orders/promotions/validate', {
      method: 'POST',
      body: { code, subtotal },
    })
  },

  async getBills() {
    const res = await request('/orders/bills/all')
    return res.ok ? res.data : null
  },

  async getBill(billNo) {
    const res = await request(`/orders/bills/${billNo}`)
    return res.ok ? res.data : null
  },

  async createBill(data) {
    return request('/orders/bills', { method: 'POST', body: data })
  },

  async getPayments() {
    const res = await request('/orders/payments/all')
    return res.ok ? res.data : null
  },

  async getPayment(billNo) {
    const res = await request(`/orders/payments/${billNo}`)
    return res.ok ? res.data : null
  },

  async createPayment(data) {
    return request('/orders/payments', { method: 'POST', body: data })
  },

  // Held bills — parked carts that survive page reloads and staff shifts.
  // These return the raw {ok, data} envelope: the POS needs error details
  // (e.g. oversized labels) surfaced verbatim alongside the data.
  async getHolds(companyId = null) {
    const path = companyId ? `/orders/holds?companyId=${companyId}` : '/orders/holds'
    return request(path)
  },

  async getHold(id) {
    return request(`/orders/holds/${id}`)
  },

  async createHold(data) {
    return request('/orders/holds', { method: 'POST', body: data })
  },

  async updateHold(id, data) {
    return request(`/orders/holds/${id}`, { method: 'PUT', body: data })
  },

  async discardHold(id) {
    return request(`/orders/holds/${id}`, { method: 'DELETE' })
  },

  async getDeliveries(status = null) {
    const path = status ? `/deliveries?status=${encodeURIComponent(status)}` : '/deliveries'
    const res = await request(path)
    return res.ok ? normalizeList(res.data, normalizeDeliveryRecord) : null
  },

  async getDeliveryByOrder(orderId) {
    const res = await request(`/deliveries/order/${orderId}`)
    return res.ok ? normalizeDeliveryRecord(res.data) : null
  },

  async getDelivery(id) {
    const res = await request(`/deliveries/${id}`)
    return res.ok ? normalizeDeliveryRecord(res.data) : null
  },

  async createDelivery(data) {
    return request('/deliveries', { method: 'POST', body: data })
  },

  async updateDelivery(id, data) {
    return request(`/deliveries/${id}`, { method: 'PUT', body: data })
  },

  async deleteDelivery(id) {
    return request(`/deliveries/${id}`, { method: 'DELETE' })
  },

  async getReturns(status = null) {
    const path = status ? `/returns?status=${encodeURIComponent(status)}` : '/returns'
    const res = await request(path)
    return res.ok ? normalizeList(res.data, normalizeReturnRecord) : null
  },

  async getReturn(id) {
    const res = await request(`/returns/${id}`)
    return res.ok ? normalizeReturnRecord(res.data) : null
  },

  async createReturn(data) {
    return request('/returns', { method: 'POST', body: data })
  },

  async updateReturn(id, data) {
    return request(`/returns/${id}`, { method: 'PUT', body: data })
  },

  async deleteReturn(id) {
    return request(`/returns/${id}`, { method: 'DELETE' })
  },

  async getSalesReport() {
    const res = await request('/reports/sales')
    return res.ok ? res.data : null
  },

  async getInventoryReport() {
    const res = await request('/reports/inventory')
    return res.ok ? res.data : null
  },

  async getReturnsReport() {
    const res = await request('/reports/returns')
    return res.ok ? res.data : null
  },

  async getSuppliers() {
    const res = await request('/suppliers')
    return res.ok ? res.data : null
  },

  async getSupplier(id) {
    const res = await request(`/suppliers/${id}`)
    return res.ok ? res.data : null
  },

  async createSupplier(data) {
    return request('/suppliers', { method: 'POST', body: data })
  },

  async updateSupplier(id, data) {
    return request(`/suppliers/${id}`, { method: 'PUT', body: data })
  },

  async deleteSupplier(id) {
    return request(`/suppliers/${id}`, { method: 'DELETE' })
  },
}
