import { apiProvider } from '../api/index.js'

function normalizeOrder(order) {
  return {
    id: String(order?.id || '-').trim() || '-',
    customer: String(order?.customer || 'Unknown').trim() || 'Unknown',
    total: Number(order?.total || 0),
    payment: String(order?.payment || 'Unknown').trim() || 'Unknown',
    status: String(order?.status || 'Unknown').trim() || 'Unknown',
    date: String(order?.date || '').trim(),
  }
}

function getFallbackBusinessData() {
  return {
    orders: [],
    inventory: [],
    deliveries: [],
    returns: [],
    users: [],
  }
}

export async function getActiveBusinessDashboardData() {
  const activeBusinessId = String(localStorage.getItem('activeBusinessId') || '').trim() || 'BIZ-101'
  const allBusinessData = await apiProvider.getBusinessData()

  if (!allBusinessData || typeof allBusinessData !== 'object') {
    return {
      businessId: activeBusinessId,
      ...getFallbackBusinessData(),
    }
  }

  const resolvedBusinessId =
    allBusinessData[activeBusinessId] && typeof allBusinessData[activeBusinessId] === 'object'
      ? activeBusinessId
      : Object.keys(allBusinessData)[0]

  const selected = allBusinessData[resolvedBusinessId]
  if (!selected || typeof selected !== 'object') {
    return {
      businessId: activeBusinessId,
      ...getFallbackBusinessData(),
    }
  }

  return {
    businessId: resolvedBusinessId,
    orders: Array.isArray(selected.orders) ? selected.orders.map(normalizeOrder) : [],
    inventory: Array.isArray(selected.inventory) ? selected.inventory : [],
    deliveries: Array.isArray(selected.deliveries) ? selected.deliveries : [],
    returns: Array.isArray(selected.returns) ? selected.returns : [],
    users: Array.isArray(selected.users) ? selected.users : [],
  }
}

export function buildDashboardSnapshot(data) {
  const orders = Array.isArray(data?.orders) ? data.orders : []
  const returns = Array.isArray(data?.returns) ? data.returns : []
  const inventory = Array.isArray(data?.inventory) ? data.inventory : []

  const totalRevenue = orders.reduce((sum, order) => sum + Math.max(0, Number(order.total || 0)), 0)
  const lowStockItems = inventory.filter((item) => Number(item?.stock || 0) < 50)
  const lowStockCount = lowStockItems.length

  const salesTrend = orders.map((order, index) => ({
    label: order.date || `Point ${index + 1}`,
    value: Math.max(0, Number(order.total || 0)),
  }))

  const statusCountMap = orders.reduce((acc, order) => {
    const status = String(order.status || 'Unknown').trim() || 'Unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const statusBreakdown = Object.keys(statusCountMap).map((status) => ({
    label: status,
    value: statusCountMap[status],
  }))

  const paymentCountMap = orders.reduce((acc, order) => {
    const payment = String(order.payment || 'Cash').trim() || 'Cash'
    acc[payment] = (acc[payment] || 0) + 1
    return acc
  }, {})

  const paymentBreakdown = Object.keys(paymentCountMap).map((pay) => ({
    name: pay,
    value: paymentCountMap[pay],
  }))

  const categoryMap = inventory.reduce((acc, item) => {
    const cat = String(item.category || 'General').trim() || 'General'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  const categoryBreakdown = Object.keys(categoryMap).map((cat) => ({
    category: cat,
    count: categoryMap[cat],
  }))

  return {
    revenue: totalRevenue,
    ordersCount: orders.length,
    returnsCount: returns.length,
    alertsCount: lowStockCount,
    salesTrend,
    statusBreakdown,
    paymentBreakdown,
    categoryBreakdown,
    lowStockItems: lowStockItems.slice(0, 4),
    recentOrders: orders.slice(0, 8),
  }
}
