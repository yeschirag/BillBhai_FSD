import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import { formatCompactNumber, formatCurrency } from '../services/workspaceService.js'
import DonutBreakdown from '../components/DonutBreakdown.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'

const EMPTY_LIST = []

// Color follows the entity: each operations category keeps its hue regardless
// of how the counts change.
const OPS_CHART_COLORS = {
  Orders: '#35c26f',
  Returns: '#e8a838',
  'Low Stock': '#64b5f6',
  Delivered: '#3fbf62',
}

function ChartTooltip({ active, payload, valueFormatter }) {
  if (!active || !payload?.length) return null

  const title = payload[0].payload?.name || payload[0].name || 'Value'
  const value = valueFormatter ? valueFormatter(payload[0].value) : payload[0].value

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
      { name: 'Orders', value: orders.length, fill: OPS_CHART_COLORS.Orders },
      { name: 'Returns', value: returns.length, fill: OPS_CHART_COLORS.Returns },
      { name: 'Low Stock', value: metrics.lowStock, fill: OPS_CHART_COLORS['Low Stock'] },
      { name: 'Delivered', value: metrics.completedDeliveries, fill: OPS_CHART_COLORS.Delivered },
    ],
    [metrics.completedDeliveries, metrics.lowStock, orders.length, returns.length],
  )

  const opsTotal = useMemo(
    () => opsMixData.reduce((sum, item) => sum + item.value, 0),
    [opsMixData],
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
                <BarChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="id"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={32}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={46}
                    tickFormatter={formatCompactNumber}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={<ChartTooltip valueFormatter={formatCurrency} />}
                  />
                  <Bar dataKey="total" fill="#35c26f" radius={[4, 4, 0, 0]} maxBarSize={24} />
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
                <DonutBreakdown
                  data={opsMixData}
                  centerValue={opsTotal}
                  centerLabel="records"
                />
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
