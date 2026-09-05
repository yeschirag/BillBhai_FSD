import { useEffect, useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNotification,
  createEmptyBusinessData,
  formatCurrency,
  getStatusBadgeClass,
  setActiveBusiness,
  upsertAuthOverride,
} from '../services/workspaceService.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'
import { toast } from '../components/toastBus.js'

const INITIAL_BUSINESS_FORM = {
  id: '',
  name: '',
  owner: '',
  adminName: '',
  type: 'Retail',
  email: '',
  phone: '',
  status: 'Active',
  productsPlan: 'Core POS',
  tenureMonths: 12,
  storesCount: 1,
  profit: 0,
  paymentDue: 0,
}

const INITIAL_DETAIL_FORM = {
  label: '',
  value: '',
  extra: '',
}

const INITIAL_USER_FORM = { name: '', email: '', role: 'Cashier', status: 'Active', password: '' }

function buildBusinessId(businesses) {
  const maxValue = businesses
    .map((item) => parseInt(String(item.id || '').replace(/[^\d]/g, ''), 10))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 100)
  return `BIZ-${maxValue + 1}`
}

function BusinessesPage() {
  const { businesses, activeBusiness, isLoading, error, refresh, mutateWorkspace } = useWorkspaceData()
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingBusinessId, setEditingBusinessId] = useState('')
  const [businessForm, setBusinessForm] = useState(INITIAL_BUSINESS_FORM)
  const [storeForm, setStoreForm] = useState(INITIAL_DETAIL_FORM)
  const [paymentForm, setPaymentForm] = useState({ month: '', amount: '', status: 'Paid' })
  const [userForm, setUserForm] = useState(INITIAL_USER_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [scopedBusinessId, setScopedBusinessId] = useState(() => activeBusiness?.id || '')

  useEffect(() => {
    if (activeBusiness?.id) {
      setScopedBusinessId(activeBusiness.id)
    }
  }, [activeBusiness?.id])

  const scopedBusiness = businesses.find((item) => item.id === scopedBusinessId) || activeBusiness || businesses[0] || null

  const stats = useMemo(() => ({
    total: businesses.length,
    active: businesses.filter((item) => String(item.status).toLowerCase() === 'active').length,
    due: businesses.reduce((sum, item) => sum + Number(item.paymentDue || 0), 0),
    profit: businesses.reduce((sum, item) => sum + Number(item.profit || 0), 0),
  }), [businesses])

  const openCreate = () => {
    setEditingBusinessId('')
    setBusinessForm(INITIAL_BUSINESS_FORM)
    setIsBusinessModalOpen(true)
  }

  const openEdit = (business) => {
    setEditingBusinessId(business.id)
    setBusinessForm({
      id: business.id,
      name: business.name,
      owner: business.owner,
      adminName: business.adminName,
      type: business.type,
      email: business.email,
      phone: business.phone,
      status: business.status,
      productsPlan: business.productsPlan,
      tenureMonths: business.tenureMonths,
      storesCount: business.storesCount,
      profit: business.profit,
      paymentDue: business.paymentDue,
    })
    setIsBusinessModalOpen(true)
  }

  const closeBusinessModal = () => {
    setEditingBusinessId('')
    setBusinessForm(INITIAL_BUSINESS_FORM)
    setIsBusinessModalOpen(false)
  }

  const handleBusinessSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    let savedLabel = ''

    await mutateWorkspace((draft) => {
      const nextId = editingBusinessId || buildBusinessId(draft.businesses)
      const existing = draft.businesses.find((item) => item.id === nextId)
      const nextBusiness = {
        ...existing,
        id: nextId,
        name: String(businessForm.name || '').trim() || 'Untitled Business',
        owner: String(businessForm.owner || '').trim() || 'Unknown Owner',
        adminName: String(businessForm.adminName || '').trim() || 'Unassigned',
        type: String(businessForm.type || '').trim() || 'Retail',
        email: String(businessForm.email || '').trim(),
        phone: String(businessForm.phone || '').trim(),
        status: String(businessForm.status || 'Active').trim(),
        productsPlan: String(businessForm.productsPlan || 'Core POS').trim(),
        tenureMonths: Number(businessForm.tenureMonths || 0),
        storesCount: Number(businessForm.storesCount || 0),
        profit: Number(businessForm.profit || 0),
        paymentDue: Number(businessForm.paymentDue || 0),
        users: existing?.users || [],
        stores: existing?.stores || [],
        payments: existing?.payments || [],
      }

      const index = draft.businesses.findIndex((item) => item.id === nextId)
      if (index >= 0) {
        draft.businesses[index] = nextBusiness
      } else {
        draft.businesses.unshift(nextBusiness)
      }
      savedLabel = `${nextBusiness.name} ${index >= 0 ? 'updated' : 'added'}`

      if (!draft.dataByBusiness[nextId]) {
        draft.dataByBusiness[nextId] = createEmptyBusinessData()
      }

      draft.notifications.unshift(
        buildNotification({
          title: `${nextBusiness.name} ${index >= 0 ? 'updated' : 'added'}`,
          desc: `${nextBusiness.productsPlan} plan is now tracked in the superuser workspace.`,
          type: 'businesses',
          color: 'blue',
          scopeBusinessId: nextId,
          detailRows: [
            { label: 'Owner', value: nextBusiness.owner },
            { label: 'Admin', value: nextBusiness.adminName },
            { label: 'Status', value: nextBusiness.status },
          ],
        }),
      )
    })

    setIsSaving(false)
    if (savedLabel) {
      toast.success(savedLabel)
      closeBusinessModal()
    }
  }

  const handleDeleteBusiness = async () => {
    if (!deleteTarget) return

    await mutateWorkspace((draft) => {
      draft.businesses = draft.businesses.filter((item) => item.id !== deleteTarget)
      delete draft.dataByBusiness[deleteTarget]
      if (draft.activeBusinessId === deleteTarget) {
        const next = draft.businesses[0]
        draft.activeBusinessId = next?.id || ''
        draft.activeBusiness = next || null
      }
    })

    setDeleteTarget(null)
    toast.success('Business deleted')
  }

  const scopeBusiness = (business) => {
    setActiveBusiness(business)
    setScopedBusinessId(business.id)
  }

  const addStore = async (event) => {
    event.preventDefault()
    if (!scopedBusiness) return
    await mutateWorkspace((draft) => {
      const business = draft.businesses.find((item) => item.id === scopedBusiness.id)
      if (!business) return
      business.stores = Array.isArray(business.stores) ? business.stores : []
      business.stores.push({
        code: String(storeForm.label || '').trim(),
        city: String(storeForm.value || '').trim(),
        status: String(storeForm.extra || 'Active').trim() || 'Active',
      })
      business.storesCount = business.stores.length
    })
    setStoreForm(INITIAL_DETAIL_FORM)
    toast.success('Store added')
  }

  const addPayment = async (event) => {
    event.preventDefault()
    if (!scopedBusiness) return
    await mutateWorkspace((draft) => {
      const business = draft.businesses.find((item) => item.id === scopedBusiness.id)
      if (!business) return
      business.payments = Array.isArray(business.payments) ? business.payments : []
      business.payments.push({
        month: String(paymentForm.month || '').trim(),
        amount: Number(paymentForm.amount || 0),
        status: String(paymentForm.status || 'Paid').trim(),
      })
      business.paymentDue = Math.max(
        0,
        business.paymentDue - (paymentForm.status === 'Paid' ? Number(paymentForm.amount || 0) : 0),
      )
    })
    setPaymentForm({ month: '', amount: '', status: 'Paid' })
    toast.success('Payment recorded')
  }

  const addBusinessUser = async (event) => {
    event.preventDefault()
    if (!scopedBusiness) return

    const username = String(userForm.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
    await mutateWorkspace((draft) => {
      const business = draft.businesses.find((item) => item.id === scopedBusiness.id)
      const activeDataForBusiness = draft.dataByBusiness[scopedBusiness.id]
      if (!business || !activeDataForBusiness) return

      const nextUser = {
        username,
        name: String(userForm.name || '').trim(),
        email: String(userForm.email || '').trim(),
        role: String(userForm.role || 'Cashier').trim(),
        status: String(userForm.status || 'Active').trim(),
      }

      business.users = Array.isArray(business.users) ? business.users : []
      business.users.push(nextUser)
      activeDataForBusiness.users = Array.isArray(activeDataForBusiness.users) ? activeDataForBusiness.users : []
      activeDataForBusiness.users.push(nextUser)
    })

    upsertAuthOverride(username, {
      username,
      name: String(userForm.name || '').trim(),
      email: String(userForm.email || '').trim(),
      role: String(userForm.role || 'Cashier').trim(),
      status: String(userForm.status || 'Active').trim(),
      password: String(userForm.password || '').trim() || undefined,
    })

    setUserForm(INITIAL_USER_FORM)
    toast.success('Business user added')
  }

  return (
    <>
      <div className="page-header">
        <h2>Businesses Using BillBhai</h2>
        <div className="page-header-actions">
          <button type="button" className="neu-btn neu-btn--primary" onClick={openCreate}>Add Business</button>
        </div>
      </div>

      <PageState loading={isLoading} error={error} label="Loading businesses…" onRetry={refresh} />

      {!isLoading && !error ? (
        <>
          <section className="stats-grid">
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Businesses</span><span className="stat-value">{stats.total}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Active</span><span className="stat-value">{stats.active}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Network Profit</span><span className="stat-value">{formatCurrency(stats.profit)}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Outstanding Due</span><span className="stat-value">{formatCurrency(stats.due)}</span></div></div>
          </section>

          <section className="neu-card">
            <div className="neu-card-hd"><h3>Client Businesses</h3></div>
            <div className="tbl-wrap">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Plan</th>
                    <th className="cell-num">Stores</th>
                    <th className="cell-num">Profit</th>
                    <th className="cell-num">Payment Due</th>
                    <th>Status</th>
                    <th className="cell-num">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.length ? businesses.map((business) => (
                    <tr key={business.id}>
                      <td className="cell-main">{business.id}</td>
                      <td>{business.name}</td>
                      <td>{business.productsPlan}</td>
                      <td className="cell-num">{business.storesCount}</td>
                      <td className="cell-num">{formatCurrency(business.profit)}</td>
                      <td className="cell-num">{formatCurrency(business.paymentDue)}</td>
                      <td><span className={`badge ${getStatusBadgeClass(business.status)}`}>{business.status}</span></td>
                      <td className="workspace-actions-cell">
                        <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm" onClick={() => scopeBusiness(business)}>Open</button>
                        <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm" onClick={() => openEdit(business)}>Edit</button>
                        <button type="button" className="neu-btn neu-btn--secondary neu-btn--sm text-danger" onClick={() => setDeleteTarget(business.id)}>Delete</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8">
                        <EmptyState title="No client businesses" hint="Add a business to start tracking plans and payments." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {scopedBusiness ? (
            <section className="grid-2">
              <div className="neu-card">
                <div className="neu-card-hd"><h3>{scopedBusiness.name}</h3></div>
                <div className="neu-card-bd workspace-detail-grid">
                  <div className="workspace-detail-neu-card"><span>Owner</span><strong>{scopedBusiness.owner}</strong></div>
                  <div className="workspace-detail-neu-card"><span>Admin</span><strong>{scopedBusiness.adminName}</strong></div>
                  <div className="workspace-detail-neu-card"><span>Email</span><strong>{scopedBusiness.email || '-'}</strong></div>
                  <div className="workspace-detail-neu-card"><span>Phone</span><strong>{scopedBusiness.phone || '-'}</strong></div>
                </div>
              </div>

              <div className="neu-card">
                <div className="neu-card-hd"><h3>Add Store</h3></div>
                <div className="neu-card-bd">
                  <form onSubmit={addStore} className="workspace-form-stack">
                    <div className="form-group">
                      <label className="form-label" htmlFor="storeCode">Store Code</label>
                      <input id="storeCode" className="form-control" required value={storeForm.label} onChange={(event) => setStoreForm((prev) => ({ ...prev, label: event.target.value }))} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="storeCity">City</label>
                        <input id="storeCity" className="form-control" required value={storeForm.value} onChange={(event) => setStoreForm((prev) => ({ ...prev, value: event.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="storeStatus">Status</label>
                        <select id="storeStatus" className="form-control" value={storeForm.extra || 'Active'} onChange={(event) => setStoreForm((prev) => ({ ...prev, extra: event.target.value }))}>
                          <option value="Active">Active</option>
                          <option value="Opening Soon">Opening Soon</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="neu-btn neu-btn--primary">Add Store</button>
                  </form>
                </div>
              </div>

              <div className="neu-card">
                <div className="neu-card-hd"><h3>Add Payment</h3></div>
                <div className="neu-card-bd">
                  <form onSubmit={addPayment} className="workspace-form-stack">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="paymentMonth">Month</label>
                        <input id="paymentMonth" className="form-control" placeholder="e.g. Aug 2026" required value={paymentForm.month} onChange={(event) => setPaymentForm((prev) => ({ ...prev, month: event.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="paymentAmount">Amount (₹)</label>
                        <input id="paymentAmount" className="form-control" type="number" min="0" step="0.01" required value={paymentForm.amount} onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="paymentStatus">Status</label>
                      <select id="paymentStatus" className="form-control" value={paymentForm.status} onChange={(event) => setPaymentForm((prev) => ({ ...prev, status: event.target.value }))}>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Due">Due</option>
                      </select>
                    </div>
                    <button type="submit" className="neu-btn neu-btn--primary">Record Payment</button>
                  </form>
                </div>
              </div>

              <div className="neu-card">
                <div className="neu-card-hd"><h3>Add Business User</h3></div>
                <div className="neu-card-bd">
                  <form onSubmit={addBusinessUser} className="workspace-form-stack">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="bizUserName">Name</label>
                        <input id="bizUserName" className="form-control" required value={userForm.name} onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="bizUserEmail">Email</label>
                        <input id="bizUserEmail" className="form-control" type="email" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="bizUserRole">Role</label>
                        <select id="bizUserRole" className="form-control" value={userForm.role} onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}>
                          <option value="Admin">Admin</option>
                          <option value="Cashier">Cashier</option>
                          <option value="Inventory Manager">Inventory Manager</option>
                          <option value="Delivery Ops">Delivery Ops</option>
                          <option value="Return Handler">Return Handler</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="bizUserPassword">Password</label>
                        <input
                          id="bizUserPassword"
                          className="form-control"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={userForm.password}
                          onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                        />
                      </div>
                    </div>
                    <button type="submit" className="neu-btn neu-btn--primary">Add Business User</button>
                  </form>
                </div>
              </div>

              <div className="neu-card">
                <div className="neu-card-hd"><h3>Store Locations</h3></div>
                <div className="neu-card-bd workspace-list-grid">
                  {(scopedBusiness.stores || []).length ? scopedBusiness.stores.map((store) => (
                    <div key={`${scopedBusiness.id}-${store.code}`} className="workspace-list-neu-card">
                      <strong>{store.code}</strong>
                      <span>{store.city}</span>
                      <span className="text-muted">{store.status}</span>
                    </div>
                  )) : <p className="text-muted">No stores added yet.</p>}
                </div>
              </div>

              <div className="neu-card">
                <div className="neu-card-hd"><h3>Payments</h3></div>
                <div className="neu-card-bd workspace-list-grid">
                  {(scopedBusiness.payments || []).length ? scopedBusiness.payments.map((payment) => (
                    <div key={`${scopedBusiness.id}-${payment.month}`} className="workspace-list-neu-card">
                      <strong>{payment.month}</strong>
                      <span>{formatCurrency(payment.amount)}</span>
                      <span className="text-muted">{payment.status}</span>
                    </div>
                  )) : <p className="text-muted">No payment records added yet.</p>}
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {isBusinessModalOpen ? (
        <Modal
          title={editingBusinessId ? 'Edit Business' : 'Add Business'}
          onClose={closeBusinessModal}
          wide
          footer={
            <>
              <button type="button" className="neu-btn neu-btn--secondary" onClick={closeBusinessModal}>Cancel</button>
              <button type="submit" form="businessForm" className="neu-btn neu-btn--primary" disabled={isSaving}>
                {editingBusinessId ? 'Save Changes' : 'Add Business'}
              </button>
            </>
          }
        >
          <form id="businessForm" onSubmit={handleBusinessSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="businessName">Business Name</label>
                <input id="businessName" className="form-control" required value={businessForm.name} onChange={(event) => setBusinessForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="businessOwner">Owner</label>
                <input id="businessOwner" className="form-control" required value={businessForm.owner} onChange={(event) => setBusinessForm((prev) => ({ ...prev, owner: event.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="businessAdmin">Admin Name</label>
                <input id="businessAdmin" className="form-control" value={businessForm.adminName} onChange={(event) => setBusinessForm((prev) => ({ ...prev, adminName: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="businessType">Type</label>
                <input id="businessType" className="form-control" value={businessForm.type} onChange={(event) => setBusinessForm((prev) => ({ ...prev, type: event.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="businessEmail">Email</label>
                <input id="businessEmail" className="form-control" type="email" value={businessForm.email} onChange={(event) => setBusinessForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="businessPhone">Phone</label>
                <input id="businessPhone" className="form-control" type="tel" value={businessForm.phone} onChange={(event) => setBusinessForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="businessPlan">Plan</label>
                <input id="businessPlan" className="form-control" value={businessForm.productsPlan} onChange={(event) => setBusinessForm((prev) => ({ ...prev, productsPlan: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="businessStatus">Status</label>
                <select id="businessStatus" className="form-control" value={businessForm.status} onChange={(event) => setBusinessForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="form-row cols-3">
              <div className="form-group">
                <label className="form-label" htmlFor="businessTenure">Tenure (months)</label>
                <input id="businessTenure" className="form-control" type="number" min="0" value={businessForm.tenureMonths} onChange={(event) => setBusinessForm((prev) => ({ ...prev, tenureMonths: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="businessStores">Stores</label>
                <input id="businessStores" className="form-control" type="number" min="0" value={businessForm.storesCount} onChange={(event) => setBusinessForm((prev) => ({ ...prev, storesCount: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="businessProfit">Profit (₹)</label>
                <input id="businessProfit" className="form-control" type="number" min="0" value={businessForm.profit} onChange={(event) => setBusinessForm((prev) => ({ ...prev, profit: event.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="businessDue">Payment Due (₹)</label>
              <input id="businessDue" className="form-control" type="number" min="0" value={businessForm.paymentDue} onChange={(event) => setBusinessForm((prev) => ({ ...prev, paymentDue: event.target.value }))} />
            </div>
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Business"
        message={`This will permanently delete ${deleteTarget || 'this business'} along with all of its orders, inventory, and records. This cannot be undone.`}
        confirmLabel="Delete Business"
        onConfirm={handleDeleteBusiness}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default BusinessesPage
