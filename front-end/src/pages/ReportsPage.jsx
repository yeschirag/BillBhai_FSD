import { useMemo } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import { formatCurrency } from '../services/workspaceService.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)
const EMPTY_LIST = []

function ReportsPage() {
  const { activeBusiness, activeData, isLoading, error } = useWorkspaceData()

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

  const revenueData = useMemo(() => ({
    labels: orders.map((item) => item.id),
    datasets: [
      {
        label: 'Order value',
        data: orders.map((item) => Number(item.total || 0)),
        backgroundColor: 'rgba(220, 53, 69, 0.75)',
        borderRadius: 8,
      },
    ],
  }), [orders])

  const opsMixData = useMemo(() => ({
    labels: ['Orders', 'Returns', 'Low Stock', 'Delivered'],
    datasets: [
      {
        data: [orders.length, returns.length, metrics.lowStock, metrics.completedDeliveries],
        backgroundColor: ['#64b5f6', '#e8a838', '#ff453a', '#34c759'],
        borderWidth: 0,
      },
    ],
  }), [metrics.completedDeliveries, metrics.lowStock, orders.length, returns.length])

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading reports...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
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
            {orders.length ? <Bar data={revenueData} options={{ responsive: true, maintainAspectRatio: false }} /> : <p className="text-muted">Add orders to unlock revenue visualizations.</p>}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><h3>Operations Mix</h3></div>
          <div className="card-bd" style={{ height: '280px' }}>
            {(orders.length || returns.length || inventory.length || deliveries.length)
              ? <Doughnut data={opsMixData} options={{ responsive: true, maintainAspectRatio: false }} />
              : <p className="text-muted">No operational activity has been recorded yet.</p>}
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
            <strong>{orders.length ? `${orders.length} orders tracked in this seed environment` : 'No orders captured yet'}</strong>
          </div>
        </div>
      </section>
    </>
  )
}

export default ReportsPage
