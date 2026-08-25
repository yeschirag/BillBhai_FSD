import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import { formatCurrency } from '../services/workspaceService.js'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'

const EMPTY_LIST = []
const CHART_COLORS = ['#dc3545', '#34c759', '#e8a838', '#64b5f6', '#ff9f0a']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const title = label || payload[0].payload?.name || payload[0].name || 'Value'
  const value = payload[0].dataKey === 'total' ? formatCurrency(payload[0].value) : payload[0].value

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{title}</p>
      <p className="chart-tooltip-value">{value}</p>
    </div>
  )
}

function ReportsPage() {
  const { activeBusiness, activeData, isLoading, error, refresh } = useWorkspaceData()

  const orders = Array.isArray(activeData?.orders) ? activeData.orders : EMPTY_LIST
  const inventory = Array.isArray(activeData?.inventory) ? activeData.inventory : EMPTY_LIST
  const returns = Array.isArray(activeData?.returns) ? activeData.returns : EMPTY_LIST
  const deliveries = Array.isArray(activeData?.deliveries) ? activeData.deliveries : EMPTY_LIST

  const metrics = useMemo(() => {
    const revenue = orders.reduce((sum, item) => sum + Number(item.total || 0), 0)
    const lowStock = inventory.filter((item) => Number(item.stock || 0) < 100).length
    const returnedAmount = returns.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const completedDeliveries = deliveries.filter((item) =>
      String(item.status || '').toLowerCase().includes('deliver')).length

    return {
      revenue,
      lowStock,
      returnedAmount,
      completedDeliveries,
    }
  }, [deliveries, inventory, orders, returns])

  const revenueData = useMemo(
    () => orders.map((item) => ({
      id: item.id,
      total: Number(item.total || 0),
    })),
    [orders],
  )

  const opsMixData = useMemo(
    () => [
      { name: 'Orders', value: orders.length, fill: CHART_COLORS[0] },
      { name: 'Returns', value: returns.length, fill: CHART_COLORS[1] },
      { name: 'Low Stock', value: metrics.lowStock, fill: CHART_COLORS[2] },
      { name: 'Delivered', value: metrics.completedDeliveries, fill: CHART_COLORS[3] },
    ],
    [metrics.completedDeliveries, metrics.lowStock, orders.length, returns.length],
  )

  if (isLoading || error) {
    return (
      <>
        <div className="page-header">
          <h2>Reports</h2>
        </div>
        <PageState loading={isLoading} error={error} label="Loading reports…" onRetry={refresh} />
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h2>Reports</h2>
      </div>

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Revenue</span><span className="stat-value">{formatCurrency(metrics.revenue)}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Returned Amount</span><span className="stat-value">{formatCurrency(metrics.returnedAmount)}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Low Stock SKUs</span><span className="stat-value">{metrics.lowStock}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Completed Deliveries</span><span className="stat-value">{metrics.completedDeliveries}</span></div></div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-hd"><h3>{activeBusiness?.name || 'Business'} Revenue Snapshot</h3></div>
          <div className="card-bd" style={{ height: '280px' }}>
            {revenueData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 8" />
                  <XAxis dataKey="id" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={42} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" fill="#dc3545" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No revenue to chart yet" hint="Revenue per order appears once orders are recorded." />}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><h3>Operations Mix</h3></div>
          <div className="card-bd" style={{ height: '280px' }}>
            {(orders.length || returns.length || inventory.length || deliveries.length)
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={opsMixData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={94}
                      paddingAngle={4}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={1}
                    >
                      {opsMixData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )
              : <EmptyState title="No operational activity yet" hint="The operations mix fills in as you record work." />}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Insights</h3></div>
        <div className="card-bd workspace-detail-grid">
          <div className="workspace-detail-card">
            <span>Top concern</span>
            <strong>{metrics.lowStock ? `${metrics.lowStock} SKUs need replenishment` : 'Inventory levels look healthy'}</strong>
          </div>
          <div className="workspace-detail-card">
            <span>Refund pressure</span>
            <strong>{metrics.returnedAmount ? `${formatCurrency(metrics.returnedAmount)} tied up in returns` : 'No refund pressure detected'}</strong>
          </div>
          <div className="workspace-detail-card">
            <span>Order throughput</span>
            <strong>{orders.length ? `${orders.length} orders recorded so far` : 'No orders captured yet'}</strong>
          </div>
        </div>
      </section>
    </>
  )
}

export default ReportsPage
