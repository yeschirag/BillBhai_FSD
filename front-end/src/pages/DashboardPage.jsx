import { useEffect, useMemo, useState } from 'react'
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  buildDashboardSnapshot,
  getActiveBusinessDashboardData,
} from '../services/dataService.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
)

function DashboardPage() {
  const [snapshot, setSnapshot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      const data = await getActiveBusinessDashboardData()
      const nextSnapshot = buildDashboardSnapshot(data)

      if (isMounted) {
        setSnapshot(nextSnapshot)
        setIsLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const salesChartData = useMemo(() => {
    if (!snapshot) return null

    return {
      labels: snapshot.salesTrend.map((point) => point.label),
      datasets: [
        {
          label: 'Sales',
          data: snapshot.salesTrend.map((point) => point.value),
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.12)',
          fill: true,
          tension: 0.28,
          pointRadius: 3,
        },
      ],
    }
  }, [snapshot])

  const statusChartData = useMemo(() => {
    if (!snapshot) return null

    return {
      labels: snapshot.statusBreakdown.map((item) => item.label),
      datasets: [
        {
          data: snapshot.statusBreakdown.map((item) => item.value),
          backgroundColor: ['#64b5f6', '#34c759', '#e8a838', '#ff453a', '#bf5af2'],
          borderWidth: 0,
        },
      ],
    }
  }, [snapshot])

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading dashboard...</div></section>
  }

  if (!snapshot) {
    return <section className="card"><div className="card-bd">Dashboard data could not be loaded.</div></section>
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
          <div className="card-bd" style={{ position: 'relative', height: '240px' }}>
            {salesChartData ? <Line data={salesChartData} /> : <p>No trend data available.</p>}
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <h3>Order Status</h3>
          </div>
          <div className="card-bd" style={{ position: 'relative', height: '240px' }}>
            {statusChartData ? <Doughnut data={statusChartData} /> : <p>No status data available.</p>}
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
