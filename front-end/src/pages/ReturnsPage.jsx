import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNextId,
  buildNotification,
  formatCurrency,
  formatTimestamp,
  getStatusBadgeClass,
} from '../services/workspaceService.js'

const INITIAL_FORM = {
  oid: '',
  reason: '',
  amount: '',
  status: 'Pending',
  requestedBy: '',
}
const EMPTY_LIST = []

function ReturnsPage() {
  const { activeData, isLoading, error, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  const returns = Array.isArray(activeData?.returns) ? activeData.returns : EMPTY_LIST
  const stats = useMemo(() => ({
    total: returns.length,
    amount: returns.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    pending: returns.filter((item) => String(item.status).toLowerCase().includes('pending')).length,
    approved: returns.filter((item) => String(item.status).toLowerCase().includes('approved')).length,
  }), [returns])

  const openCreate = () => {
    setEditingId('')
    setForm(INITIAL_FORM)
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      oid: item.oid,
      reason: item.reason,
      amount: Number(item.amount || 0),
      status: item.status,
      requestedBy: item.requestedBy,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingId('')
    setForm(INITIAL_FORM)
    setIsModalOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      const target = draft.dataByBusiness[businessId]
      const nextReturn = {
        id: editingId || buildNextId('RET', target.returns, 551),
        oid: String(form.oid || '').trim(),
        reason: String(form.reason || '').trim() || 'Return requested',
        amount: Math.max(0, Number(form.amount || 0)),
        status: String(form.status || 'Pending').trim(),
        requestedBy: String(form.requestedBy || '').trim() || 'Customer',
        updatedAt: formatTimestamp(),
      }

      const index = target.returns.findIndex((item) => item.id === nextReturn.id)
      if (index >= 0) {
        target.returns[index] = nextReturn
      } else {
        target.returns.unshift(nextReturn)
      }

      draft.notifications.unshift(
        buildNotification({
          title: `${nextReturn.id} ${index >= 0 ? 'updated' : 'raised'}`,
          desc: `${nextReturn.requestedBy} requested ${formatCurrency(nextReturn.amount)} for ${draft.activeBusiness.name}.`,
          type: 'return',
          color: nextReturn.status === 'Approved' ? 'green' : 'amber',
          scopeBusinessId: businessId,
          detailRows: [
            { label: 'Order', value: nextReturn.oid || '-' },
            { label: 'Reason', value: nextReturn.reason },
            { label: 'Status', value: nextReturn.status },
          ],
        }),
      )
    })

    closeModal()
  }

  const handleDelete = async (id) => {
    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      draft.dataByBusiness[businessId].returns = draft.dataByBusiness[businessId].returns.filter(
        (item) => item.id !== id,
      )
    })
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading returns...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <>
      <div className="page-header">
        <h2>Returns &amp; Refunds</h2>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>+ Raise Return</button>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Requests</span><span className="stat-value">{stats.total}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Refund Exposure</span><span className="stat-value">{formatCurrency(stats.amount)}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Pending</span><span className="stat-value">{stats.pending}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Approved</span><span className="stat-value">{stats.approved}</span></div></div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Return Log</h3></div>
        <div className="card-bd">
          <div className="tbl-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Return ID</th>
                  <th>Order</th>
                  <th>Reason</th>
                  <th>Amount</th>
                  <th>Requested By</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.length ? returns.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-main">{item.id}</td>
                    <td>{item.oid || '-'}</td>
                    <td>{item.reason}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td>{item.requestedBy}</td>
                    <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span></td>
                    <td>{item.updatedAt}</td>
                    <td className="workspace-actions-cell">
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => openEdit(item)}>Edit</button>
                      <button type="button" className="btn btn-outline btn-xs btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8">No return requests available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>{editingId ? 'Edit Return' : 'Raise Return'}</h3>
            <button type="button" className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="returnOrder">Order ID</label>
                  <input id="returnOrder" className="form-control" value={form.oid} onChange={(event) => setForm((prev) => ({ ...prev, oid: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="returnRequester">Requested By</label>
                  <input id="returnRequester" className="form-control" value={form.requestedBy} onChange={(event) => setForm((prev) => ({ ...prev, requestedBy: event.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="returnReason">Reason</label>
                <textarea id="returnReason" className="form-control" rows="3" value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="returnAmount">Amount</label>
                  <input id="returnAmount" className="form-control" type="number" min="0" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="returnStatus">Status</label>
                  <select id="returnStatus" className="form-control" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Raise Return'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default ReturnsPage
