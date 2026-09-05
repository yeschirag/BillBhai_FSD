import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNextId,
  buildNotification,
  formatCurrency,
  formatDisplayDateTime,
  formatTimestamp,
  getPaymentBadgeClass,
  getStatusBadgeClass,
} from '../services/workspaceService.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'
import { toast } from '../components/toastBus.js'

const INITIAL_FORM = {
  customer: '',
  items: 1,
  total: '',
  payment: 'UPI',
  status: 'Pending',
}
const EMPTY_LIST = []

function OrdersPage() {
  const { activeBusiness, activeData, currentUser, isLoading, error, refresh, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const orders = Array.isArray(activeData?.orders) ? activeData.orders : EMPTY_LIST
  const canEdit = currentUser?.role !== 'customer'

  const stats = useMemo(() => {
    const pending = orders.filter((item) => String(item.status).toLowerCase().includes('pending')).length
    const cancelled = orders.filter((item) => String(item.status).toLowerCase().includes('cancel')).length
    const revenue = orders.reduce((sum, item) => sum + Number(item.total || 0), 0)
    return {
      total: orders.length,
      pending,
      cancelled,
      revenue,
    }
  }, [orders])

  const openCreate = () => {
    setEditingId('')
    setForm(INITIAL_FORM)
    setIsModalOpen(true)
  }

  const openEdit = (order) => {
    setEditingId(order.id)
    setForm({
      customer: order.customer,
      items: Number(order.items || 1),
      total: Number(order.total || 0),
      payment: order.payment,
      status: order.status,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId('')
    setForm(INITIAL_FORM)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!activeBusiness || isSaving) return

    setIsSaving(true)
    let savedLabel = ''

    try {
      await mutateWorkspace((draft) => {
        const businessId = draft.activeBusiness?.id || draft.activeBusinessId || 'BIZ-101'
        if (!draft.dataByBusiness[businessId]) {
          draft.dataByBusiness[businessId] = { orders: [], inventory: [], deliveries: [], returns: [], users: [] }
        }
        const target = draft.dataByBusiness[businessId]
        target.orders = Array.isArray(target.orders) ? target.orders : []
        const nextOrder = {
          id: editingId || buildNextId('ORD', target.orders, 551),
          customer: String(form.customer || '').trim() || 'Walk-in',
          items: Math.max(1, Number(form.items || 1)),
          total: Math.max(0, Number(form.total || 0)),
          payment: String(form.payment || 'UPI').trim() || 'UPI',
          status: String(form.status || 'Pending').trim() || 'Pending',
          date: formatTimestamp(),
        }

        const index = target.orders.findIndex((item) => item.id === nextOrder.id)
        if (index >= 0) {
          target.orders[index] = { ...target.orders[index], ...nextOrder }
        } else {
          target.orders.unshift(nextOrder)
        }
        savedLabel = `${nextOrder.id} ${index >= 0 ? 'updated' : 'created'}`

        draft.notifications.unshift(
          buildNotification({
            title: `${nextOrder.id} ${index >= 0 ? 'updated' : 'created'}`,
            desc: `${nextOrder.customer} order recorded for ${formatCurrency(nextOrder.total)} in ${draft.activeBusiness?.name || 'Store'}.`,
            type: 'order',
            color: 'blue',
            scopeBusinessId: businessId,
            detailRows: [
              { label: 'Business', value: draft.activeBusiness?.name || 'Store' },
              { label: 'Customer', value: nextOrder.customer },
              { label: 'Payment', value: nextOrder.payment },
              { label: 'Status', value: nextOrder.status },
            ],
          }),
        )
      })

      if (savedLabel) {
        toast.success(savedLabel)
        closeModal()
      }
    } catch (err) {
      console.error('Order save failed', err)
      toast.error(err?.message || 'Could not save order. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness?.id || draft.activeBusinessId || 'BIZ-101'
      if (draft.dataByBusiness[businessId]?.orders) {
        draft.dataByBusiness[businessId].orders = draft.dataByBusiness[businessId].orders.filter(
          (item) => item.id !== deleteTarget,
        )
      }
    })

    setDeleteTarget(null)
    toast.success(`Order deleted`)
  }

  return (
    <>
      <div className="page-header">
        <h2>Orders &amp; Billing</h2>
        <div className="page-header-actions">
          {canEdit ? (
            <button type="button" className="neu-btn neu-btn--primary" onClick={openCreate}>
              New Order
            </button>
          ) : null}
          <button type="button" className="neu-btn neu-btn--secondary" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <PageState loading={isLoading} error={error} label="Loading orders…" onRetry={refresh} />

      {!isLoading && !error ? (
        <>
          <section className="stats-grid">
            <div className="stat-neu-card">
              <div className="stat-info"><span className="stat-label">Total Orders</span><span className="stat-value">{stats.total}</span></div>
            </div>
            <div className="stat-neu-card">
              <div className="stat-info"><span className="stat-label">Revenue</span><span className="stat-value">{formatCurrency(stats.revenue)}</span></div>
            </div>
            <div className="stat-neu-card">
              <div className="stat-info"><span className="stat-label">Pending</span><span className="stat-value">{stats.pending}</span></div>
            </div>
            <div className="stat-neu-card">
              <div className="stat-info"><span className="stat-label">Cancelled</span><span className="stat-value">{stats.cancelled}</span></div>
            </div>
          </section>

          <section className="neu-card">
            <div className="neu-card-hd">
              <h3>{activeBusiness?.name || 'Current Business'} Orders</h3>
            </div>
            <div className="tbl-wrap">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th className="cell-num">Items</th>
                    <th className="cell-num">Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Date</th>
                    {canEdit ? <th className="cell-num">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {orders.length ? orders.map((order) => (
                    <tr key={order.id}>
                      <td className="cell-main">{order.id}</td>
                      <td>{order.customer}</td>
                      <td className="cell-num">{order.items}</td>
                      <td className="cell-num">{formatCurrency(order.total)}</td>
                      <td><span className={`badge ${getPaymentBadgeClass(order.payment)}`}>{order.payment}</span></td>
                      <td><span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span></td>
                      <td>{formatDisplayDateTime(order.date)}</td>
                      {canEdit ? (
                        <td className="workspace-actions-cell">
                          <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm" onClick={() => openEdit(order)}>Edit</button>
                          <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm text-danger" onClick={() => setDeleteTarget(order.id)}>Delete</button>
                        </td>
                      ) : null}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={canEdit ? 8 : 7}>
                        <EmptyState title="No orders yet" hint="Create your first order to start tracking billing." />
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
          title={editingId ? 'Edit Order' : 'Create Order'}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="neu-btn neu-btn--secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="orderForm" className="neu-btn neu-btn--primary" disabled={isSaving}>
                {editingId ? 'Save Changes' : 'Create Order'}
              </button>
            </>
          }
        >
          <form id="orderForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="orderCustomer">Customer Name</label>
              <input id="orderCustomer" className="form-control" required value={form.customer} onChange={(event) => setForm((prev) => ({ ...prev, customer: event.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="orderItems">Items</label>
                <input id="orderItems" className="form-control" type="number" min="1" required value={form.items} onChange={(event) => setForm((prev) => ({ ...prev, items: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="orderTotal">Total (₹)</label>
                <input id="orderTotal" className="form-control" type="number" min="0" step="0.01" required value={form.total} onChange={(event) => setForm((prev) => ({ ...prev, total: event.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="orderPayment">Payment</label>
                <select id="orderPayment" className="form-control" value={form.payment} onChange={(event) => setForm((prev) => ({ ...prev, payment: event.target.value }))}>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="COD">COD</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="orderStatus">Status</label>
                <select id="orderStatus" className="form-control" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Order"
        message={`This will permanently remove ${deleteTarget || 'this order'} from your records.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default OrdersPage
