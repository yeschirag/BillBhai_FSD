import { Link, useNavigate } from 'react-router-dom'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  formatCurrency,
  getStatusBadgeClass,
  setActiveBusiness,
} from '../services/workspaceService.js'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'

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

  if (isLoading || error) {
    return (
      <>
        <div className="page-header">
          <h2>Super User Portal</h2>
        </div>
        <PageState loading={isLoading} error={error} label="Loading network overview…" />
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h2>Super User Portal</h2>
        <div className="page-header-actions">
          <Link to="/businesses" className="neu-btn neu-btn--primary">Manage Businesses</Link>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Businesses</span><span className="stat-value">{businesses.length}</span></div></div>
        <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Active</span><span className="stat-value">{totals.active}</span></div></div>
        <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Trial</span><span className="stat-value">{totals.trial}</span></div></div>
        <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Outstanding Due</span><span className="stat-value">{formatCurrency(totals.paymentDue)}</span></div></div>
      </section>

      <section className="grid-2">
        <div className="neu-card">
          <div className="neu-card-hd"><h3>Network Snapshot</h3></div>
          <div className="neu-card-bd workspace-detail-grid">
            <div className="workspace-detail-neu-card">
              <span>Network Revenue</span>
              <strong>{formatCurrency(totals.revenue)}</strong>
            </div>
            <div className="workspace-detail-neu-card">
              <span>Average Stores / Business</span>
              <strong>{businesses.length ? (businesses.reduce((sum, item) => sum + Number(item.storesCount || 0), 0) / businesses.length).toFixed(1) : '0.0'}</strong>
            </div>
            <div className="workspace-detail-neu-card">
              <span>Most Users</span>
              <strong>{businesses.slice().sort((a, b) => (b.users?.length || 0) - (a.users?.length || 0))[0]?.name || 'N/A'}</strong>
            </div>
          </div>
        </div>

        <div className="neu-card">
          <div className="neu-card-hd"><h3>Quick Actions</h3></div>
          <div className="neu-card-bd workspace-form-stack">
            <Link to="/businesses" className="neu-btn neu-btn--secondary">Open business management</Link>
            <Link to="/dashboard" className="neu-btn neu-btn--secondary">Jump to scoped dashboard</Link>
            <Link to="/notifications" className="neu-btn neu-btn--secondary">Review system notifications</Link>
          </div>
        </div>
      </section>

      <section className="neu-card">
        <div className="neu-card-hd"><h3>Client Businesses</h3></div>
        <div className="neu-card-bd">
          <div className="tbl-wrap">
            <table className="neu-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Plan</th>
                  <th className="cell-num">Stores</th>
                  <th>Status</th>
                  <th className="cell-num">Payment Due</th>
                  <th className="cell-num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.length ? businesses.map((business) => (
                  <tr key={business.id}>
                    <td className="cell-main">{business.name}</td>
                    <td>{business.productsPlan}</td>
                    <td className="cell-num">{business.storesCount}</td>
                    <td><span className={`badge ${getStatusBadgeClass(business.status)}`}>{business.status}</span></td>
                    <td className="cell-num">{formatCurrency(business.paymentDue)}</td>
                    <td className="workspace-actions-cell">
                      <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm" onClick={() => openBusiness(business)}>Open</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6">
                      <EmptyState title="No businesses yet" hint="Add client businesses to see them here." />
                    </td>
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

export default SuperuserPage
