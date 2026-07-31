import { Link, useNavigate } from 'react-router-dom'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import { formatCurrency, setActiveBusiness } from '../services/workspaceService.js'

function SuperuserPage() {
  const { businesses, dataByBusiness, isLoading, error } = useWorkspaceData()
  const navigate = useNavigate()

  const totals = businesses.reduce((acc, business) => {
    const scopedData = dataByBusiness[business.id] || { orders: [] }
    acc.revenue += (scopedData.orders || []).reduce((sum, item) => sum + Number(item.total || 0), 0)
    acc.paymentDue += Number(business.paymentDue || 0)
    if (String(business.status).toLowerCase() === 'active') acc.active += 1
    if (String(business.status).toLowerCase() === 'trial') acc.trial += 1
    return acc
  }, { revenue: 0, paymentDue: 0, active: 0, trial: 0 })

  const openBusiness = (business) => {
    setActiveBusiness(business)
    navigate('/businesses')
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading superuser portal...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <>
      <div className="page-header">
        <h2>Super User Portal</h2>
        <div className="page-header-actions">
          <Link to="/businesses" className="btn btn-primary">Manage Businesses</Link>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Businesses</span><span className="stat-value">{businesses.length}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Active</span><span className="stat-value">{totals.active}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Trial</span><span className="stat-value">{totals.trial}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Outstanding Due</span><span className="stat-value">{formatCurrency(totals.paymentDue)}</span></div></div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-hd"><h3>Network Snapshot</h3></div>
          <div className="card-bd workspace-detail-grid">
            <div className="workspace-detail-card">
              <span>Tracked Revenue</span>
              <strong>{formatCurrency(totals.revenue)}</strong>
            </div>
            <div className="workspace-detail-card">
              <span>Average Stores / Business</span>
              <strong>{businesses.length ? (businesses.reduce((sum, item) => sum + Number(item.storesCount || 0), 0) / businesses.length).toFixed(1) : '0.0'}</strong>
            </div>
            <div className="workspace-detail-card">
              <span>Most Users</span>
              <strong>{businesses.slice().sort((a, b) => (b.users?.length || 0) - (a.users?.length || 0))[0]?.name || 'N/A'}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><h3>Quick Actions</h3></div>
          <div className="card-bd workspace-form-stack">
            <Link to="/businesses" className="btn btn-outline">Open business management</Link>
            <Link to="/dashboard" className="btn btn-outline">Jump to scoped dashboard</Link>
            <Link to="/notifications" className="btn btn-outline">Review system notifications</Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Client Businesses</h3></div>
        <div className="card-bd">
          <div className="tbl-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Plan</th>
                  <th>Stores</th>
                  <th>Status</th>
                  <th>Payment Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((business) => (
                  <tr key={business.id}>
                    <td className="cell-main">{business.name}</td>
                    <td>{business.productsPlan}</td>
                    <td>{business.storesCount}</td>
                    <td>{business.status}</td>
                    <td>{formatCurrency(business.paymentDue)}</td>
                    <td className="workspace-actions-cell">
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => openBusiness(business)}>Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}

export default SuperuserPage
