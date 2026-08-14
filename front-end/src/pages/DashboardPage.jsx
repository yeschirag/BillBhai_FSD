import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildDashboardSnapshot,
  getActiveBusinessDashboardData,
} from '../services/dataService.js'

const CHART_COLORS = ['#dc3545', '#34c759', '#e8a838', '#64b5f6', '#ff9f0a']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const title = label || payload[0].payload?.name || payload[0].name || 'Value'

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{title}</p>
      <p className="chart-tooltip-value">{payload[0].value}</p>
    </div>
  )
}

function DashboardPage() {
  const [snapshot, setSnapshot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getActiveBusinessDashboardData()
        const nextSnapshot = buildDashboardSnapshot(data)

        if (isMounted) {
          setSnapshot(nextSnapshot)
        }
      } catch (err) {
        if (isMounted) {
          setSnapshot(null)
          setError(err instanceof Error ? err.message : 'Dashboard data could not be loaded.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const salesChartData = useMemo(
    () => (snapshot ? snapshot.salesTrend.map((point) => ({
      label: point.label,
      value: Number(point.value || 0),
    })) : []),
    [snapshot],
  )

  const statusChartData = useMemo(
    () => (snapshot ? snapshot.statusBreakdown.map((item, index) => ({
      name: item.label,
      value: Number(item.value || 0),
      fill: CHART_COLORS[index % CHART_COLORS.length],
    })) : []),
    [snapshot],
  )

  if (isLoading) {
    return (
      <>
        <div className="page-header">
          <h2>Dashboard</h2>
          <div className="page-header-actions">
            <button className="btn btn-outline" disabled>
              Loading…
            </button>
          </div>
        </div>

        <div className="dashboard-loading-shell">
          <div className="dashboard-loading-card">
            <span className="dashboard-loading-spinner" aria-hidden="true" />
            <span>Loading orders...</span>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <div className="card loading-panel error-panel">
        <div className="card-hd">
          <h3>Dashboard</h3>
        </div>
        <div className="card-bd">
          <p className="loading-error-message">{error}</p>
        </div>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="card loading-panel error-panel">
        <div className="card-hd">
          <h3>Dashboard</h3>
        </div>
        <div className="card-bd">
          <p className="loading-error-message">Dashboard data could not be loaded.</p>
        </div>
      </div>
    )
  }

  const statusBadgeClass = (status) => {
    const value = String(status || '').toLowerCase()
    if (value.includes('deliver')) return 'b-delivered'
    if (value.includes('process')) return 'b-processing'
    if (value.includes('cancel')) return 'b-cancelled'
    return 'b-pending'
  }

  const paymentBadgeClass = (payment) => {
    const value = String(payment || '').toLowerCase()
    if (value.includes('upi')) return 'b-upi'
    if (value.includes('cash')) return 'b-cash'
    if (value.includes('card')) return 'b-card'
    return 'b-processing'
  }

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon si-green">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Revenue</span>
            <span className="stat-value">₹{snapshot.revenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon si-blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Orders</span>
            <span className="stat-value">{snapshot.ordersCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon si-red">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Returns</span>
            <span className="stat-value">{snapshot.returnsCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon si-amber">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Alerts</span>
            <span className="stat-value">{snapshot.alertsCount}</span>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-hd">
            <h3>Sales Trend</h3>
          </div>
          <div className="card-bd" style={{ position: 'relative', height: '260px' }}>
            {salesChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesChartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dc3545" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#dc3545" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 8" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#dc3545"
                    strokeWidth={3}
                    fill="url(#salesGradient)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p>No trend data available.</p>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <h3>Order Status</h3>
          </div>
          <div className="card-bd" style={{ position: 'relative', height: '260px' }}>
            {statusChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={94}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p>No status data available.</p>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-hd">
          <h3>Recent Orders</h3>
        </div>
        <div className="card-bd">
          <div className="tbl-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentOrders.length ? (
                  snapshot.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="cell-main">{order.id}</td>
                      <td>{order.customer}</td>
                      <td>Rs {Math.max(0, Number(order.total || 0)).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${paymentBadgeClass(order.payment)}`}>{order.payment}</span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass(order.status)}`}>{order.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No orders available for current business.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}

export default DashboardPage
