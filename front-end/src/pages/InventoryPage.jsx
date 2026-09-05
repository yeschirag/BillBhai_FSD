import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNextId,
  buildNotification,
  deriveInventoryStatus,
  formatCurrency,
  getStatusBadgeClass,
} from '../services/workspaceService.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'
import { toast } from '../components/toastBus.js'

const INITIAL_FORM = {
  name: '',
  cat: 'Groceries',
  supplier: '',
  stock: '',
  price: '',
}
const EMPTY_LIST = []

function InventoryPage() {
  const { activeBusiness, activeData, isLoading, error, refresh, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingSku, setEditingSku] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

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
        target.inventory = Array.isArray(target.inventory) ? target.inventory : []
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
        savedLabel = `${nextItem.name} ${index >= 0 ? 'updated' : 'added'}`

        draft.notifications.unshift(
          buildNotification({
            title: `${nextItem.name} inventory ${index >= 0 ? 'updated' : 'added'}`,
            desc: `${nextItem.sku} now has ${nextItem.stock} units in ${draft.activeBusiness?.name || 'Store'}.`,
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

      if (savedLabel) {
        toast.success(savedLabel)
        closeModal()
      }
    } catch (err) {
      console.error('Inventory save failed', err)
      toast.error(err?.message || 'Could not save product. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness?.id || draft.activeBusinessId || 'BIZ-101'
      if (draft.dataByBusiness[businessId]?.inventory) {
        draft.dataByBusiness[businessId].inventory = draft.dataByBusiness[businessId].inventory.filter(
          (item) => item.sku !== deleteTarget,
        )
      }
    })

    setDeleteTarget(null)
    toast.success('Product removed')
  }

  return (
    <>
      <div className="page-header">
        <h2>Inventory</h2>
        <div className="page-header-actions">
          <button type="button" className="neu-btn neu-btn--primary" onClick={openCreate}>Add Product</button>
        </div>
      </div>

      <PageState loading={isLoading} error={error} label="Loading inventory…" onRetry={refresh} />

      {!isLoading && !error ? (
        <>
          <section className="stats-grid">
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">SKUs</span><span className="stat-value">{stats.total}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Low Stock</span><span className="stat-value">{stats.low}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Out of Stock</span><span className="stat-value">{stats.out}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Inventory Value</span><span className="stat-value">{formatCurrency(stats.value)}</span></div></div>
          </section>

          <section className="neu-card">
            <div className="neu-card-hd"><h3>Stock Register</h3></div>
            <div className="tbl-wrap">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th className="cell-num">Stock</th>
                    <th className="cell-num">Price</th>
                    <th>Status</th>
                    <th className="cell-num">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length ? inventory.map((item) => (
                    <tr key={item.sku}>
                      <td className="cell-main">{item.sku}</td>
                      <td>{item.name}</td>
                      <td>{item.cat}</td>
                      <td>{item.supplier}</td>
                      <td className="cell-num">{item.stock}</td>
                      <td className="cell-num">{formatCurrency(item.price)}</td>
                      <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span></td>
                      <td className="workspace-actions-cell">
                        <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm" onClick={() => openEdit(item)}>Edit</button>
                        <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm text-danger" onClick={() => setDeleteTarget(item.sku)}>Delete</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8">
                        <EmptyState title="No products yet" hint="Add your first product to start tracking stock." />
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
          title={editingSku ? 'Edit Product' : 'Add Product'}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="neu-btn neu-btn--secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="inventoryForm" className="neu-btn neu-btn--primary" disabled={isSaving}>
                {editingSku ? 'Save Changes' : 'Add Product'}
              </button>
            </>
          }
        >
          <form id="inventoryForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="inventoryName">Product Name</label>
              <input id="inventoryName" className="form-control" required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
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
                <label className="form-label" htmlFor="inventoryStock">Stock (units)</label>
                <input id="inventoryStock" className="form-control" type="number" min="0" required value={form.stock} onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="inventoryPrice">Unit Price (₹)</label>
                <input id="inventoryPrice" className="form-control" type="number" min="0" step="0.01" required value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Product"
        message={`This will permanently remove product ${deleteTarget || ''} from your stock register.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default InventoryPage
