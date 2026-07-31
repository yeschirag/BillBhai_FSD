import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNotification,
  getStatusBadgeClass,
  upsertAuthOverride,
} from '../services/workspaceService.js'

const ROLE_OPTIONS = [
  'Admin',
  'Cashier',
  'Inventory Manager',
  'Delivery Ops',
  'Return Handler',
  'Customer',
]
const EMPTY_LIST = []

const INITIAL_FORM = {
  name: '',
  email: '',
  role: 'Cashier',
  status: 'Active',
  username: '',
  password: '',
}

function createUsernameSeed(form) {
  const raw = String(form.username || form.name || '').trim().toLowerCase()
  return raw.replace(/[^a-z0-9]+/g, '')
}

function UsersPage() {
  const { activeBusiness, activeData, isLoading, error, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUsername, setEditingUsername] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  const users = Array.isArray(activeData?.users) ? activeData.users : EMPTY_LIST
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((item) => String(item.status).toLowerCase() === 'active').length,
    suspended: users.filter((item) => String(item.status).toLowerCase() !== 'active').length,
    admins: users.filter((item) => String(item.role).toLowerCase().includes('admin')).length,
  }), [users])

  const openCreate = () => {
    setEditingUsername('')
    setForm(INITIAL_FORM)
    setIsModalOpen(true)
  }

  const openEdit = (user) => {
    setEditingUsername(user.username || createUsernameSeed(user))
    setForm({
      name: user.name,
      email: user.email || '',
      role: user.role,
      status: user.status,
      username: user.username || '',
      password: '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingUsername('')
    setForm(INITIAL_FORM)
    setIsModalOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!activeBusiness) return

    const resolvedUsername = createUsernameSeed(form)
    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      const target = draft.dataByBusiness[businessId]
      const nextUser = {
        username: editingUsername || resolvedUsername,
        name: String(form.name || '').trim() || 'Unnamed User',
        email: String(form.email || '').trim(),
        role: String(form.role || 'Cashier').trim(),
        status: String(form.status || 'Active').trim(),
      }

      const index = target.users.findIndex((item) => (item.username || createUsernameSeed(item)) === nextUser.username)
      if (index >= 0) {
        target.users[index] = nextUser
      } else {
        target.users.unshift(nextUser)
      }

      const businessIndex = draft.businesses.findIndex((item) => item.id === businessId)
      if (businessIndex >= 0) {
        draft.businesses[businessIndex].users = [...target.users]
        draft.businesses[businessIndex].adminName =
          draft.businesses[businessIndex].users.find((item) => String(item.role).toLowerCase().includes('admin'))?.name
          || draft.businesses[businessIndex].adminName
      }

      draft.notifications.unshift(
        buildNotification({
          title: `${nextUser.name} ${index >= 0 ? 'updated' : 'added'}`,
          desc: `${nextUser.role} access is now ${nextUser.status.toLowerCase()} for ${draft.activeBusiness.name}.`,
          type: 'user',
          color: nextUser.status === 'Active' ? 'purple' : 'amber',
          scopeBusinessId: businessId,
          detailRows: [
            { label: 'Business', value: draft.activeBusiness.name },
            { label: 'Username', value: nextUser.username },
            { label: 'Role', value: nextUser.role },
          ],
        }),
      )
    })

    upsertAuthOverride(editingUsername || resolvedUsername, {
      username: editingUsername || resolvedUsername,
      name: String(form.name || '').trim(),
      email: String(form.email || '').trim(),
      role: String(form.role || 'Cashier').trim(),
      status: String(form.status || 'Active').trim(),
      password: String(form.password || '').trim() || undefined,
    })

    closeModal()
  }

  const handleDelete = async (username) => {
    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness.id
      draft.dataByBusiness[businessId].users = draft.dataByBusiness[businessId].users.filter(
        (item) => (item.username || createUsernameSeed(item)) !== username,
      )
      const businessIndex = draft.businesses.findIndex((item) => item.id === businessId)
      if (businessIndex >= 0) {
        draft.businesses[businessIndex].users = [...draft.dataByBusiness[businessId].users]
      }
    })
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading users...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <>
      <div className="page-header">
        <h2>Users</h2>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>+ Add User</button>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Users</span><span className="stat-value">{stats.total}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Active</span><span className="stat-value">{stats.active}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Suspended</span><span className="stat-value">{stats.suspended}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Admins</span><span className="stat-value">{stats.admins}</span></div></div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Team Members</h3></div>
        <div className="card-bd">
          <div className="tbl-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? users.map((user) => {
                  const username = user.username || createUsernameSeed(user)
                  return (
                    <tr key={username}>
                      <td className="cell-main">{user.name}</td>
                      <td>{username}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.role}</td>
                      <td><span className={`badge ${getStatusBadgeClass(user.status)}`}>{user.status}</span></td>
                      <td className="workspace-actions-cell">
                        <button type="button" className="btn btn-outline btn-xs" onClick={() => openEdit(user)}>Edit</button>
                        <button type="button" className="btn btn-outline btn-xs btn-danger" onClick={() => handleDelete(username)}>Delete</button>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan="6">No team members have been added.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>{editingUsername ? 'Edit User' : 'Add User'}</h3>
            <button type="button" className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="userName">Full Name</label>
                  <input id="userName" className="form-control" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="userUsername">Username</label>
                  <input id="userUsername" className="form-control" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} placeholder="auto-generated if blank" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="userEmail">Email</label>
                  <input id="userEmail" className="form-control" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="userPassword">Password</label>
                  <input id="userPassword" className="form-control" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} placeholder={editingUsername ? 'leave blank to keep current' : 'required for login'} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="userRole">Role</label>
                  <select id="userRole" className="form-control" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}>
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="userStatus">Status</label>
                  <select id="userStatus" className="form-control" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingUsername ? 'Save Changes' : 'Add User'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default UsersPage
