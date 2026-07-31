import { request } from '../httpClient.js'

export const remoteProvider = {
  // Auth
  async login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: payload,
    })
  },
  async getAuthConfig() {
    return null
  },

  // Aggregation helpers for Workspace State
  async getBusinesses() {
    const companies = await this.getCompanies()
    if (!Array.isArray(companies)) return null
    return companies
  },
  async getBusinessData() {
    const [orders, inventory, deliveries, returns, users] = await Promise.all([
      this.getOrders(),
      this.getInventory(),
      this.getDeliveries(),
      this.getReturns(),
      this.getUsers(),
    ])

    const safeOrders = Array.isArray(orders) ? orders : []
    const safeInventory = Array.isArray(inventory) ? inventory : []
    const safeDeliveries = Array.isArray(deliveries) ? deliveries : []
    const safeReturns = Array.isArray(returns) ? returns : []
    const safeUsers = Array.isArray(users) ? users : []

    return {
      'BIZ-101': {
        orders: safeOrders.filter((o) => !o.companyId || o.companyId === 'BIZ-101'),
        inventory: safeInventory.filter((i) => !i.companyId || i.companyId === 'BIZ-101'),
        deliveries: safeDeliveries.filter((d) => !d.companyId || d.companyId === 'BIZ-101'),
        returns: safeReturns.filter((r) => !r.companyId || r.companyId === 'BIZ-101'),
        users: safeUsers.filter((u) => !u.companyId || u.companyId === 'BIZ-101'),
      },
      'BIZ-102': {
        orders: safeOrders.filter((o) => o.companyId === 'BIZ-102'),
        inventory: safeInventory.filter((i) => i.companyId === 'BIZ-102'),
        deliveries: safeDeliveries.filter((d) => d.companyId === 'BIZ-102'),
        returns: safeReturns.filter((r) => r.companyId === 'BIZ-102'),
        users: safeUsers.filter((u) => u.companyId === 'BIZ-102'),
      },
    }
  },

  // Companies / Businesses
  async getCompanies() {
    const res = await request('/companies')
    return res.ok ? res.data : null
  },
  async getCompany(id) {
    const res = await request(`/companies/${id}`)
    return res.ok ? res.data : null
  },
  async createCompany(data) {
    return request('/companies', { method: 'POST', body: data })
  },
  async updateCompany(id, data) {
    return request(`/companies/${id}`, { method: 'PUT', body: data })
  },
  async deleteCompany(id) {
    return request(`/companies/${id}`, { method: 'DELETE' })
  },

  // Users
  async getUsers(companyId = null) {
    const path = companyId ? `/users?companyId=${companyId}` : '/users'
    const res = await request(path)
    return res.ok ? res.data : null
  },
  async getUser(id) {
    const res = await request(`/users/${id}`)
    return res.ok ? res.data : null
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

  // Customers
  async getCustomers(companyId = null) {
    const path = companyId ? `/customers?companyId=${companyId}` : '/customers'
    const res = await request(path)
    return res.ok ? res.data : null
  },
  async getCustomerByPhone(phone) {
    const res = await request(`/customers/phone/${phone}`)
    return res.ok ? res.data : null
  },
  async getCustomer(id) {
    const res = await request(`/customers/${id}`)
    return res.ok ? res.data : null
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

  // Products
  async getProducts(category = null) {
    const path = category && category !== 'All' ? `/products?category=${category}` : '/products'
    const res = await request(path)
    return res.ok ? res.data : null
  },
  async getProductCategories() {
    const res = await request('/products/categories')
    return res.ok ? res.data : null
  },
  async getProductByBarcode(barcode) {
    const res = await request(`/products/barcode/${barcode}`)
    return res.ok ? res.data : null
  },
  async getProduct(id) {
    const res = await request(`/products/${id}`)
    return res.ok ? res.data : null
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

  // Inventory
  async getInventory() {
    const res = await request('/inventory')
    return res.ok ? res.data : null
  },
  async getLowStockItems() {
    const res = await request('/inventory/low-stock')
    return res.ok ? res.data : null
  },
  async getInventoryByProduct(productId) {
    const res = await request(`/inventory/product/${productId}`)
    return res.ok ? res.data : null
  },
  async getInventoryItem(id) {
    const res = await request(`/inventory/${id}`)
    return res.ok ? res.data : null
  },
  async updateInventory(id, data) {
    return request(`/inventory/${id}`, { method: 'PUT', body: data })
  },
  async adjustStock(data) {
    return request('/inventory/adjust', { method: 'POST', body: data })
  },

  // Orders
  async getOrders(companyId = null) {
    const path = companyId ? `/orders?companyId=${companyId}` : '/orders'
    const res = await request(path)
    return res.ok ? res.data : null
  },
  async getOrder(id) {
    const res = await request(`/orders/${id}`)
    return res.ok ? res.data : null
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

  // Deliveries
  async getDeliveries(status = null) {
    const path = status ? `/deliveries?status=${status}` : '/deliveries'
    const res = await request(path)
    return res.ok ? res.data : null
  },
  async getDeliveryByOrder(orderId) {
    const res = await request(`/deliveries/order/${orderId}`)
    return res.ok ? res.data : null
  },
  async getDelivery(id) {
    const res = await request(`/deliveries/${id}`)
    return res.ok ? res.data : null
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

  // Returns
  async getReturns(status = null) {
    const path = status ? `/returns?status=${status}` : '/returns'
    const res = await request(path)
    return res.ok ? res.data : null
  },
  async getReturn(id) {
    const res = await request(`/returns/${id}`)
    return res.ok ? res.data : null
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

  // Reports
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

  // Suppliers
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
