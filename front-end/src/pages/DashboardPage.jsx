import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildDashboardSnapshot,
  getActiveBusinessDashboardData,
} from '../services/dataService.js'
import { formatCompactNumber, formatCurrency, formatDisplayDateTime } from '../services/workspaceService.js'
import DonutBreakdown from '../components/DonutBreakdown.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'

// Color follows the entity: status segments keep their badge colors regardless
// of how many statuses exist or how their counts change.
const STATUS_CHART_COLORS = {
  processing: '#64b5f6',
  pending: '#e8a838',
  delivered: '#3fbf62',
  completed: '#3fbf62',
  cancelled: '#ef6a74',
}

function statusChartColor(name) {
  const key = String(name || '').toLowerCase().replace(/\s+/g, '')
  return STATUS_CHART_COLORS[key] || '#a78bfa'
}

function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null

  const title = labelFormatter && label
    ? labelFormatter(label)
    : (label || payload[0].payload?.name || payload[0].name || 'Value')

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{title}</p>
      <p className="chart-tooltip-value">
        {valueFormatter ? valueFormatter(payload[0].value) : payload[0].value}
      </p>
    </div>
  )
}

function DashboardPage() {
  const [snapshot, setSnapshot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

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
  }, [reloadKey])

  const salesChartData = useMemo(
    () => (snapshot ? snapshot.salesTrend.map((point) => ({
      label: point.label,
      value: Number(point.value || 0),
    })) : []),
    [snapshot],
  )

  const statusChartData = useMemo(
    () => (snapshot ? snapshot.statusBreakdown.map((item) => ({
      name: item.label,
      value: Number(item.value || 0),
      fill: statusChartColor(item.label),
    })) : []),
    [snapshot],
  )

  if (isLoading || error || !snapshot) {
    return (
      <>
        <div className="page-header">
          <h2>Dashboard</h2>
          <div className="page-header-actions">
            <button type="button" className="btn btn-outline" onClick={() => window.print()} disabled={isLoading || Boolean(error)}>
              Print
            </button>
          </div>
        </div>
        <PageState
          loading={isLoading}
          error={error || (!snapshot && !isLoading ? 'Dashboard data could not be loaded.' : '')}
          label="Loading dashboard…"
          onRetry={error ? () => setReloadKey((key) => key + 1) : undefined}
        />
      </>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Revenue</span>
            <span className="stat-value">{formatCurrency(snapshot.revenue)}</span>
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
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#35c26f" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#35c26f" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={formatDisplayDateTime}
                    minTickGap={48}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={46}
                    tickFormatter={formatCompactNumber}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    content={<ChartTooltip labelFormatter={formatDisplayDateTime} valueFormatter={formatCurrency} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#35c26f"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#14161b' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No trend data yet" hint="Sales will chart here as orders come in." />
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <h3>Order Status</h3>
          </div>
          <div className="card-bd" style={{ position: 'relative', height: '260px' }}>
            {statusChartData.length ? (
              <DonutBreakdown
                data={statusChartData}
                centerValue={snapshot.ordersCount}
                centerLabel={snapshot.ordersCount === 1 ? 'order' : 'orders'}
              />
            ) : (
              <EmptyState title="No orders yet" hint="Status breakdown appears once orders exist." />
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-hd">
          <h3>Recent Orders</h3>
        </div>
        <div className="tbl-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th className="cell-num">Total</th>
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
                    <td className="cell-num">{formatCurrency(order.total)}</td>
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
                  <td colSpan="5">
                    <EmptyState title="No orders available" hint="Orders for the current business will appear here." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default DashboardPage
