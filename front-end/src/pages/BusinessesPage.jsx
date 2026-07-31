import { useEffect, useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNotification,
  createEmptyBusinessData,
  formatCurrency,
  setActiveBusiness,
  upsertAuthOverride,
} from '../services/workspaceService.js'

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

function buildBusinessId(businesses) {
  const maxValue = businesses
    .map((item) => parseInt(String(item.id || '').replace(/[^\d]/g, ''), 10))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 100)
  return `BIZ-${maxValue + 1}`
}

function BusinessesPage() {
  const { businesses, activeBusiness, isLoading, error, mutateWorkspace } = useWorkspaceData()
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false)
  const [editingBusinessId, setEditingBusinessId] = useState('')
  const [businessForm, setBusinessForm] = useState(INITIAL_BUSINESS_FORM)
  const [storeForm, setStoreForm] = useState(INITIAL_DETAIL_FORM)
  const [paymentForm, setPaymentForm] = useState({ month: '', amount: '', status: 'Paid' })
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'Cashier', status: 'Active', password: '' })
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

      if (!draft.dataByBusiness[nextId]) {
        draft.dataByBusiness[nextId] = createEmptyBusinessData()
      }

      draft.notifications.unshift(
        buildNotification({
          title: `${nextBusiness.name} ${index >= 0 ? 'updated' : 'added'}`,
          desc: `${nextBusiness.productsPlan} plan is now tracked in the superuser workspace.`,
          type: 'businesses',
          color: 'purple',
          scopeBusinessId: nextId,
          detailRows: [
            { label: 'Owner', value: nextBusiness.owner },
            { label: 'Admin', value: nextBusiness.adminName },
            { label: 'Status', value: nextBusiness.status },
          ],
        }),
      )
    })

    closeBusinessModal()
  }

  const deleteBusiness = async (businessId) => {
    await mutateWorkspace((draft) => {
      draft.businesses = draft.businesses.filter((item) => item.id !== businessId)
      delete draft.dataByBusiness[businessId]
    })
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

    setUserForm({ name: '', email: '', role: 'Cashier', status: 'Active', password: '' })
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading businesses...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <>
      <div className="page-header">
        <h2>Businesses Using BillBhai</h2>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>+ Add Business</button>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Businesses</span><span className="stat-value">{stats.total}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Active</span><span className="stat-value">{stats.active}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Network Profit</span><span className="stat-value">{formatCurrency(stats.profit)}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Outstanding Due</span><span className="stat-value">{formatCurrency(stats.due)}</span></div></div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Client Businesses</h3></div>
        <div className="card-bd">
          <div className="tbl-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Plan</th>
                  <th>Stores</th>
                  <th>Profit</th>
                  <th>Payment Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((business) => (
                  <tr key={business.id}>
                    <td className="cell-main">{business.id}</td>
                    <td>{business.name}</td>
                    <td>{business.productsPlan}</td>
                    <td>{business.storesCount}</td>
                    <td>{formatCurrency(business.profit)}</td>
                    <td>{formatCurrency(business.paymentDue)}</td>
                    <td>{business.status}</td>
                    <td className="workspace-actions-cell">
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => scopeBusiness(business)}>Open</button>
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => openEdit(business)}>Edit</button>
                      <button type="button" className="btn btn-outline btn-xs btn-danger" onClick={() => deleteBusiness(business.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {scopedBusiness ? (
        <section className="grid-2">
          <div className="card">
            <div className="card-hd"><h3>{scopedBusiness.name}</h3></div>
            <div className="card-bd workspace-detail-grid">
              <div className="workspace-detail-card"><span>Owner</span><strong>{scopedBusiness.owner}</strong></div>
              <div className="workspace-detail-card"><span>Admin</span><strong>{scopedBusiness.adminName}</strong></div>
              <div className="workspace-detail-card"><span>Email</span><strong>{scopedBusiness.email || '-'}</strong></div>
              <div className="workspace-detail-card"><span>Phone</span><strong>{scopedBusiness.phone || '-'}</strong></div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><h3>Add Store</h3></div>
            <div className="card-bd">
              <form onSubmit={addStore} className="workspace-form-stack">
                <input className="form-control" placeholder="Store Code" value={storeForm.label} onChange={(event) => setStoreForm((prev) => ({ ...prev, label: event.target.value }))} />
                <input className="form-control" placeholder="City" value={storeForm.value} onChange={(event) => setStoreForm((prev) => ({ ...prev, value: event.target.value }))} />
                <input className="form-control" placeholder="Status" value={storeForm.extra} onChange={(event) => setStoreForm((prev) => ({ ...prev, extra: event.target.value }))} />
                <button type="submit" className="btn btn-primary">Add Store</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><h3>Add Payment</h3></div>
            <div className="card-bd">
              <form onSubmit={addPayment} className="workspace-form-stack">
                <input className="form-control" placeholder="Month" value={paymentForm.month} onChange={(event) => setPaymentForm((prev) => ({ ...prev, month: event.target.value }))} />
                <input className="form-control" placeholder="Amount" type="number" min="0" value={paymentForm.amount} onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))} />
                <select className="form-control" value={paymentForm.status} onChange={(event) => setPaymentForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Due">Due</option>
                </select>
                <button type="submit" className="btn btn-primary">Add Payment</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><h3>Add Business User</h3></div>
            <div className="card-bd">
              <form onSubmit={addBusinessUser} className="workspace-form-stack">
                <input className="form-control" placeholder="Name" value={userForm.name} onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))} />
                <input className="form-control" placeholder="Email" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} />
                <select className="form-control" value={userForm.role} onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}>
                  <option value="Admin">Admin</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Inventory Manager">Inventory Manager</option>
                  <option value="Delivery Ops">Delivery Ops</option>
                  <option value="Return Handler">Return Handler</option>
                </select>
                <input className="form-control" placeholder="Password" value={userForm.password} onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))} />
                <button type="submit" className="btn btn-primary">Add Business User</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><h3>Store Locations</h3></div>
            <div className="card-bd workspace-list-grid">
              {(scopedBusiness.stores || []).length ? scopedBusiness.stores.map((store) => (
                <div key={`${scopedBusiness.id}-${store.code}`} className="workspace-list-card">
                  <strong>{store.code}</strong>
                  <span>{store.city}</span>
                  <span className="text-muted">{store.status}</span>
                </div>
              )) : <p className="text-muted">No stores added yet.</p>}
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><h3>Payments</h3></div>
            <div className="card-bd workspace-list-grid">
              {(scopedBusiness.payments || []).length ? scopedBusiness.payments.map((payment) => (
                <div key={`${scopedBusiness.id}-${payment.month}`} className="workspace-list-card">
                  <strong>{payment.month}</strong>
                  <span>{formatCurrency(payment.amount)}</span>
                  <span className="text-muted">{payment.status}</span>
                </div>
              )) : <p className="text-muted">No payment records added yet.</p>}
            </div>
          </div>
        </section>
      ) : null}

      <div className={`modal-overlay ${isBusinessModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>{editingBusinessId ? 'Edit Business' : 'Add Business'}</h3>
            <button type="button" className="modal-close" onClick={closeBusinessModal}>&times;</button>
          </div>
          <form onSubmit={handleBusinessSubmit}>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="businessName">Business Name</label>
                  <input id="businessName" className="form-control" value={businessForm.name} onChange={(event) => setBusinessForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="businessOwner">Owner</label>
                  <input id="businessOwner" className="form-control" value={businessForm.owner} onChange={(event) => setBusinessForm((prev) => ({ ...prev, owner: event.target.value }))} />
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
                  <input id="businessEmail" className="form-control" value={businessForm.email} onChange={(event) => setBusinessForm((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="businessPhone">Phone</label>
                  <input id="businessPhone" className="form-control" value={businessForm.phone} onChange={(event) => setBusinessForm((prev) => ({ ...prev, phone: event.target.value }))} />
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
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="businessTenure">Tenure (months)</label>
                  <input id="businessTenure" className="form-control" type="number" min="0" value={businessForm.tenureMonths} onChange={(event) => setBusinessForm((prev) => ({ ...prev, tenureMonths: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="businessStores">Stores</label>
                  <input id="businessStores" className="form-control" type="number" min="0" value={businessForm.storesCount} onChange={(event) => setBusinessForm((prev) => ({ ...prev, storesCount: event.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="businessProfit">Profit</label>
                  <input id="businessProfit" className="form-control" type="number" min="0" value={businessForm.profit} onChange={(event) => setBusinessForm((prev) => ({ ...prev, profit: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="businessDue">Payment Due</label>
                  <input id="businessDue" className="form-control" type="number" min="0" value={businessForm.paymentDue} onChange={(event) => setBusinessForm((prev) => ({ ...prev, paymentDue: event.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeBusinessModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingBusinessId ? 'Save Changes' : 'Add Business'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default BusinessesPage
