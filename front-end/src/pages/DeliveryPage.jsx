import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNextId,
  buildNotification,
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
  customer: '',
  address: '',
  partner: '',
  partnerPhone: '',
  status: 'Pending',
  etaMin: 40,
}
const EMPTY_LIST = []

function DeliveryPage() {
  const { activeData, isLoading, error, refresh, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const deliveries = Array.isArray(activeData?.deliveries) ? activeData.deliveries : EMPTY_LIST
  const stats = useMemo(() => ({
    total: deliveries.length,
    pending: deliveries.filter((item) => String(item.status).toLowerCase().includes('pending')).length,
    transit: deliveries.filter((item) => String(item.status).toLowerCase().includes('transit')).length,
    delivered: deliveries.filter((item) => String(item.status).toLowerCase().includes('deliver')).length,
  }), [deliveries])

  const openCreate = () => {
    setEditingId('')
    setForm(INITIAL_FORM)
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      oid: item.oid,
      customer: item.customer,
      address: item.address,
      partner: item.partner,
      partnerPhone: item.partnerPhone,
      status: item.status,
      etaMin: item.etaMin ?? 40,
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
      target.deliveries = Array.isArray(target.deliveries) ? target.deliveries : []
      const nextDelivery = {
        id: editingId || buildNextId('DEL', target.deliveries, 551),
        oid: String(form.oid || '').trim(),
        customer: String(form.customer || '').trim(),
        address: String(form.address || '').trim(),
        partner: String(form.partner || '').trim(),
        partnerPhone: String(form.partnerPhone || '').trim(),
        status: String(form.status || 'Pending').trim(),
        etaMin: Number(form.etaMin || 0) || null,
        time: formatTimestamp().slice(-5),
        updatedAt: formatTimestamp(),
      }

      const index = target.deliveries.findIndex((item) => item.id === nextDelivery.id)
      if (index >= 0) {
        target.deliveries[index] = nextDelivery
      } else {
        target.deliveries.unshift(nextDelivery)
      }
      savedLabel = `${nextDelivery.id} ${index >= 0 ? 'updated' : 'created'}`

      draft.notifications.unshift(
        buildNotification({
          title: `${nextDelivery.id} ${index >= 0 ? 'updated' : 'created'}`,
          desc: `${nextDelivery.customer || 'Delivery'} is ${nextDelivery.status.toLowerCase()} for ${draft.activeBusiness?.name || 'Store'}.`,
          type: 'delivery',
          color: nextDelivery.status === 'Delivered' ? 'green' : 'blue',
          scopeBusinessId: businessId,
          detailRows: [
            { label: 'Order', value: nextDelivery.oid || '-' },
            { label: 'Partner', value: nextDelivery.partner || 'Unassigned' },
            { label: 'ETA', value: nextDelivery.etaMin ? `${nextDelivery.etaMin} mins` : '-' },
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
      if (draft.dataByBusiness[businessId]?.deliveries) {
        draft.dataByBusiness[businessId].deliveries = draft.dataByBusiness[businessId].deliveries.filter(
          (item) => item.id !== deleteTarget,
        )
      }
    })

    setDeleteTarget(null)
    toast.success('Dispatch deleted')
  }

  return (
    <>
      <div className="page-header">
        <h2>Delivery</h2>
        <div className="page-header-actions">
          <button type="button" className="neu-btn neu-neu-btn--primary" onClick={openCreate}>Add Dispatch</button>
        </div>
      </div>

      <PageState loading={isLoading} error={error} label="Loading deliveries…" onRetry={refresh} />

      {!isLoading && !error ? (
        <>
          <section className="stats-grid">
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Total</span><span className="stat-value">{stats.total}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Pending</span><span className="stat-value">{stats.pending}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">In Transit</span><span className="stat-value">{stats.transit}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Delivered</span><span className="stat-value">{stats.delivered}</span></div></div>
          </section>

          <section className="neu-card">
            <div className="neu-card-hd"><h3>Dispatch Queue</h3></div>
            <div className="tbl-wrap">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th>Delivery ID</th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Partner</th>
                    <th>Status</th>
                    <th className="cell-num">ETA</th>
                    <th>Updated</th>
                    <th className="cell-num">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.length ? deliveries.map((item) => (
                    <tr key={item.id}>
                      <td className="cell-main">{item.id}</td>
                      <td>{item.oid || '-'}</td>
                      <td>{item.customer || '-'}</td>
                      <td>{item.partner || 'Unassigned'}</td>
                      <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span></td>
                      <td className="cell-num">{item.etaMin ? `${item.etaMin} mins` : '-'}</td>
                      <td>{formatDisplayDateTime(item.updatedAt || item.time)}</td>
                      <td className="workspace-actions-cell">
                        <button type="button" className="neu-btn neu-btn--secondary neu-neu-btn--sm" onClick={() => openEdit(item)}>Edit</button>
                        <button type="button" className="neu-btn neu-btn--secondary neu-neu-btn--sm text-danger" onClick={() => setDeleteTarget(item.id)}>Delete</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8">
                        <EmptyState title="Nothing in the dispatch queue" hint="Add a dispatch to start tracking deliveries." />
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
          title={editingId ? 'Edit Delivery' : 'Create Delivery'}
          onClose={closeModal}
          wide
          footer={
            <>
              <button type="button" className="neu-btn neu-neu-btn--secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="deliveryForm" className="neu-btn neu-neu-btn--primary" disabled={isSaving}>
                {editingId ? 'Save Changes' : 'Create Dispatch'}
              </button>
            </>
          }
        >
          <form id="deliveryForm" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="deliveryOrder">Order ID</label>
                <input id="deliveryOrder" className="form-control" value={form.oid} onChange={(event) => setForm((prev) => ({ ...prev, oid: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="deliveryCustomer">Customer</label>
                <input id="deliveryCustomer" className="form-control" value={form.customer} onChange={(event) => setForm((prev) => ({ ...prev, customer: event.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="deliveryAddress">Address</label>
              <textarea id="deliveryAddress" className="form-control" rows="3" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="deliveryPartner">Partner</label>
                <input id="deliveryPartner" className="form-control" value={form.partner} onChange={(event) => setForm((prev) => ({ ...prev, partner: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="deliveryPhone">Partner Phone</label>
                <input id="deliveryPhone" className="form-control" type="tel" value={form.partnerPhone} onChange={(event) => setForm((prev) => ({ ...prev, partnerPhone: event.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="deliveryStatus">Status</label>
                <select id="deliveryStatus" className="form-control" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="deliveryEta">ETA (mins)</label>
                <input id="deliveryEta" className="form-control" type="number" min="0" value={form.etaMin} onChange={(event) => setForm((prev) => ({ ...prev, etaMin: event.target.value }))} />
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Dispatch"
        message={`This will permanently remove ${deleteTarget || 'this dispatch'} from the queue.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default DeliveryPage
