import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNextId,
  buildNotification,
  formatCurrency,
  formatTimestamp,
  getPaymentBadgeClass,
  getStatusBadgeClass,
} from '../services/workspaceService.js'

const INITIAL_FORM = {
  customer: '',
  items: 1,
  total: '',
  payment: 'UPI',
  status: 'Pending',
}
const EMPTY_LIST = []

function OrdersPage() {
  const { activeBusiness, activeData, currentUser, isLoading, error, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

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
    if (!activeBusiness) return

    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      const target = draft.dataByBusiness[businessId]
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

      draft.notifications.unshift(
        buildNotification({
          title: `${nextOrder.id} ${index >= 0 ? 'updated' : 'created'}`,
          desc: `${nextOrder.customer} order recorded for ${formatCurrency(nextOrder.total)} in ${activeBusiness.name}.`,
          type: 'order',
          color: 'blue',
          scopeBusinessId: businessId,
          detailRows: [
            { label: 'Business', value: activeBusiness.name },
            { label: 'Customer', value: nextOrder.customer },
            { label: 'Payment', value: nextOrder.payment },
            { label: 'Status', value: nextOrder.status },
          ],
        }),
      )
    })

    closeModal()
  }

  const handleDelete = async (orderId) => {
    if (!activeBusiness) return
    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      draft.dataByBusiness[businessId].orders = draft.dataByBusiness[businessId].orders.filter(
        (item) => item.id !== orderId,
      )
    })
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading orders...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <>
      <div className="page-header">
        <h2>Orders &amp; Billing</h2>
        <div className="page-header-actions">
          {canEdit ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + New Order
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-info"><span className="stat-label">Total Orders</span><span className="stat-value">{stats.total}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><span className="stat-label">Revenue</span><span className="stat-value">{formatCurrency(stats.revenue)}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><span className="stat-label">Pending</span><span className="stat-value">{stats.pending}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><span className="stat-label">Cancelled</span><span className="stat-value">{stats.cancelled}</span></div>
        </div>
      </section>

      <section className="card">
        <div className="card-hd">
          <h3>{activeBusiness?.name || 'Current Business'} Orders</h3>
        </div>
        <div className="card-bd">
          <div className="tbl-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  {canEdit ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {orders.length ? orders.map((order) => (
                  <tr key={order.id}>
                    <td className="cell-main">{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{order.items}</td>
                    <td>{formatCurrency(order.total)}</td>
                    <td><span className={`badge ${getPaymentBadgeClass(order.payment)}`}>{order.payment}</span></td>
                    <td><span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span></td>
                    <td>{order.date}</td>
                    {canEdit ? (
                      <td className="workspace-actions-cell">
                        <button type="button" className="btn btn-outline btn-xs" onClick={() => openEdit(order)}>Edit</button>
                        <button type="button" className="btn btn-outline btn-xs btn-danger" onClick={() => handleDelete(order.id)}>Delete</button>
                      </td>
                    ) : null}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7}>No orders available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>{editingId ? 'Edit Order' : 'Create Order'}</h3>
            <button type="button" className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="orderCustomer">Customer Name</label>
                <input id="orderCustomer" className="form-control" value={form.customer} onChange={(event) => setForm((prev) => ({ ...prev, customer: event.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="orderItems">Items</label>
                  <input id="orderItems" className="form-control" type="number" min="1" value={form.items} onChange={(event) => setForm((prev) => ({ ...prev, items: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="orderTotal">Total</label>
                  <input id="orderTotal" className="form-control" type="number" min="0" value={form.total} onChange={(event) => setForm((prev) => ({ ...prev, total: event.target.value }))} />
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
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Order'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default OrdersPage
