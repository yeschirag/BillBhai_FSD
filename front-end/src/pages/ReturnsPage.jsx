import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNextId,
  buildNotification,
  formatCurrency,
  formatDisplayDateTime,
  formatTimestamp,
  getStatusBadgeClass,
} from '../services/workspaceService.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'
import { toast } from '../components/toastBus.js'

const INITIAL_FORM = {
  oid: '',
  reason: '',
  amount: '',
  status: 'Pending',
  requestedBy: '',
}
const EMPTY_LIST = []

function ReturnsPage() {
  const { activeData, isLoading, error, refresh, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

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
    if (isSaving) return

    setIsSaving(true)
    let savedLabel = ''

    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness?.id || draft.activeBusinessId || 'BIZ-101'
      if (!draft.dataByBusiness[businessId]) {
        draft.dataByBusiness[businessId] = { orders: [], inventory: [], deliveries: [], returns: [], users: [] }
      }
      const target = draft.dataByBusiness[businessId]
      target.returns = Array.isArray(target.returns) ? target.returns : []
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
      savedLabel = `${nextReturn.id} ${index >= 0 ? 'updated' : 'raised'}`

      draft.notifications.unshift(
        buildNotification({
          title: `${nextReturn.id} ${index >= 0 ? 'updated' : 'raised'}`,
          desc: `${nextReturn.requestedBy} requested ${formatCurrency(nextReturn.amount)} for ${draft.activeBusiness?.name || 'Store'}.`,
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

    setIsSaving(false)
    if (savedLabel) {
      toast.success(savedLabel)
      closeModal()
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness?.id || draft.activeBusinessId || 'BIZ-101'
      if (draft.dataByBusiness[businessId]?.returns) {
        draft.dataByBusiness[businessId].returns = draft.dataByBusiness[businessId].returns.filter(
          (item) => item.id !== deleteTarget,
        )
      }
    })

    setDeleteTarget(null)
    toast.success('Return request deleted')
  }

  return (
    <>
      <div className="page-header">
        <h2>Returns &amp; Refunds</h2>
        <div className="page-header-actions">
          <button type="button" className="neu-btn neu-neu-btn--primary" onClick={openCreate}>Raise Return</button>
        </div>
      </div>

      <PageState loading={isLoading} error={error} label="Loading returns…" onRetry={refresh} />

      {!isLoading && !error ? (
        <>
          <section className="stats-grid">
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Requests</span><span className="stat-value">{stats.total}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Refund Exposure</span><span className="stat-value">{formatCurrency(stats.amount)}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Pending</span><span className="stat-value">{stats.pending}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Approved</span><span className="stat-value">{stats.approved}</span></div></div>
          </section>

          <section className="neu-card">
            <div className="neu-card-hd"><h3>Return Log</h3></div>
            <div className="tbl-wrap">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th>Return ID</th>
                    <th>Order</th>
                    <th>Reason</th>
                    <th className="cell-num">Amount</th>
                    <th>Requested By</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="cell-num">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.length ? returns.map((item) => (
                    <tr key={item.id}>
                      <td className="cell-main">{item.id}</td>
                      <td>{item.oid || '-'}</td>
                      <td>{item.reason}</td>
                      <td className="cell-num">{formatCurrency(item.amount)}</td>
                      <td>{item.requestedBy}</td>
                      <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span></td>
                      <td>{formatDisplayDateTime(item.updatedAt)}</td>
                      <td className="workspace-actions-cell">
                        <button type="button" className="neu-btn neu-btn--secondary neu-neu-btn--sm" onClick={() => openEdit(item)}>Edit</button>
                        <button type="button" className="neu-btn neu-btn--secondary neu-neu-btn--sm text-danger" onClick={() => setDeleteTarget(item.id)}>Delete</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8">
                        <EmptyState title="No returns raised" hint="Return requests will appear here once raised." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {isModalOpen ? (
        <Modal
          title={editingId ? 'Edit Return' : 'Raise Return'}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="neu-btn neu-neu-btn--secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="returnForm" className="neu-btn neu-neu-btn--primary" disabled={isSaving}>
                {editingId ? 'Save Changes' : 'Raise Return'}
              </button>
            </>
          }
        >
          <form id="returnForm" onSubmit={handleSubmit}>
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
                <label className="form-label" htmlFor="returnAmount">Amount (₹)</label>
                <input id="returnAmount" className="form-control" type="number" min="0" step="0.01" required value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} />
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
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Return Request"
        message={`This will permanently remove ${deleteTarget || 'this request'} from the return log.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default ReturnsPage
