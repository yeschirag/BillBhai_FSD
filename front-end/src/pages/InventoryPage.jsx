import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNextId,
  buildNotification,
  deriveInventoryStatus,
  formatCurrency,
  getStatusBadgeClass,
} from '../services/workspaceService.js'

const INITIAL_FORM = {
  name: '',
  cat: 'Groceries',
  supplier: '',
  stock: '',
  price: '',
}
const EMPTY_LIST = []

function InventoryPage() {
  const { activeBusiness, activeData, isLoading, error, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSku, setEditingSku] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  const inventory = Array.isArray(activeData?.inventory) ? activeData.inventory : EMPTY_LIST
  const stats = useMemo(() => ({
    total: inventory.length,
    low: inventory.filter((item) => Number(item.stock || 0) > 0 && Number(item.stock || 0) < 100).length,
    out: inventory.filter((item) => Number(item.stock || 0) <= 0).length,
    value: inventory.reduce((sum, item) => sum + (Number(item.stock || 0) * Number(item.price || 0)), 0),
  }), [inventory])

  const openCreate = () => {
    setEditingSku('')
    setForm(INITIAL_FORM)
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingSku(item.sku)
    setForm({
      name: item.name,
      cat: item.cat,
      supplier: item.supplier,
      stock: Number(item.stock || 0),
      price: Number(item.price || 0),
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingSku('')
    setForm(INITIAL_FORM)
    setIsModalOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!activeBusiness) return

    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      const target = draft.dataByBusiness[businessId]
      const stock = Math.max(0, Number(form.stock || 0))
      const nextItem = {
        sku: editingSku || buildNextId('SKU', target.inventory.map((item) => ({ id: item.sku })), 551),
        name: String(form.name || '').trim() || 'Unnamed Item',
        cat: String(form.cat || '').trim() || 'General',
        supplier: String(form.supplier || '').trim() || 'Unassigned',
        stock,
        price: Math.max(0, Number(form.price || 0)),
        status: deriveInventoryStatus(stock),
      }

      const index = target.inventory.findIndex((item) => item.sku === nextItem.sku)
      if (index >= 0) {
        target.inventory[index] = nextItem
      } else {
        target.inventory.unshift(nextItem)
      }

      draft.notifications.unshift(
        buildNotification({
          title: `${nextItem.name} inventory ${index >= 0 ? 'updated' : 'added'}`,
          desc: `${nextItem.sku} now has ${nextItem.stock} units in ${activeBusiness.name}.`,
          type: 'alert',
          color: stock < 100 ? 'amber' : 'green',
          scopeBusinessId: businessId,
          detailRows: [
            { label: 'Supplier', value: nextItem.supplier },
            { label: 'Category', value: nextItem.cat },
            { label: 'Status', value: nextItem.status },
          ],
        }),
      )
    })

    closeModal()
  }

  const handleDelete = async (sku) => {
    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      draft.dataByBusiness[businessId].inventory = draft.dataByBusiness[businessId].inventory.filter(
        (item) => item.sku !== sku,
      )
    })
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading inventory...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <>
      <div className="page-header">
        <h2>Inventory</h2>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-info"><span className="stat-label">SKUs</span><span className="stat-value">{stats.total}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Low Stock</span><span className="stat-value">{stats.low}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Out of Stock</span><span className="stat-value">{stats.out}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Inventory Value</span><span className="stat-value">{formatCurrency(stats.value)}</span></div></div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Stock Register</h3></div>
        <div className="card-bd">
          <div className="tbl-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length ? inventory.map((item) => (
                  <tr key={item.sku}>
                    <td className="cell-main">{item.sku}</td>
                    <td>{item.name}</td>
                    <td>{item.cat}</td>
                    <td>{item.supplier}</td>
                    <td>{item.stock}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span></td>
                    <td className="workspace-actions-cell">
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => openEdit(item)}>Edit</button>
                      <button type="button" className="btn btn-outline btn-xs btn-danger" onClick={() => handleDelete(item.sku)}>Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8">No inventory records available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>{editingSku ? 'Edit Product' : 'Add Product'}</h3>
            <button type="button" className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="inventoryName">Product Name</label>
                <input id="inventoryName" className="form-control" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="inventoryCategory">Category</label>
                  <input id="inventoryCategory" className="form-control" value={form.cat} onChange={(event) => setForm((prev) => ({ ...prev, cat: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inventorySupplier">Supplier</label>
                  <input id="inventorySupplier" className="form-control" value={form.supplier} onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="inventoryStock">Stock</label>
                  <input id="inventoryStock" className="form-control" type="number" min="0" value={form.stock} onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inventoryPrice">Unit Price</label>
                  <input id="inventoryPrice" className="form-control" type="number" min="0" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingSku ? 'Save Changes' : 'Add Product'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default InventoryPage
