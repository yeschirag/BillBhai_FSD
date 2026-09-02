import { useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  buildNotification,
  getStatusBadgeClass,
  upsertAuthOverride,
} from '../services/workspaceService.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'
import { toast } from '../components/toastBus.js'

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
  const { activeBusiness, activeData, isLoading, error, refresh, mutateWorkspace } = useWorkspaceData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingUsername, setEditingUsername] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

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
    if (!activeBusiness || isSaving) return

    setIsSaving(true)
    const resolvedUsername = createUsernameSeed(form)
    let savedLabel = ''

    await mutateWorkspace((draft) => {
      const businessId = draft.activeBusiness?.id || draft.activeBusinessId || 'BIZ-101'
      if (!draft.dataByBusiness[businessId]) {
        draft.dataByBusiness[businessId] = { orders: [], inventory: [], deliveries: [], returns: [], users: [] }
      }
      const target = draft.dataByBusiness[businessId]
      target.users = Array.isArray(target.users) ? target.users : []
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
      savedLabel = `${nextUser.name} ${index >= 0 ? 'updated' : 'added'}`

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
          desc: `${nextUser.role} access is now ${nextUser.status.toLowerCase()} for ${draft.activeBusiness?.name || 'Store'}.`,
          type: 'user',
          color: nextUser.status === 'Active' ? 'green' : 'amber',
          scopeBusinessId: businessId,
          detailRows: [
            { label: 'Business', value: draft.activeBusiness?.name || 'Store' },
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
      if (draft.dataByBusiness[businessId]?.users) {
        draft.dataByBusiness[businessId].users = draft.dataByBusiness[businessId].users.filter(
          (item) => (item.username || createUsernameSeed(item)) !== deleteTarget,
        )
      }
      const businessIndex = draft.businesses.findIndex((item) => item.id === businessId)
      if (businessIndex >= 0) {
        draft.businesses[businessIndex].users = [...draft.dataByBusiness[businessId].users]
      }
    })

    setDeleteTarget(null)
    toast.success('Team member removed')
  }

  return (
    <>
      <div className="page-header">
        <h2>Users</h2>
        <div className="page-header-actions">
          <button type="button" className="neu-btn neu-neu-btn--primary" onClick={openCreate}>Add User</button>
        </div>
      </div>

      <PageState loading={isLoading} error={error} label="Loading users…" onRetry={refresh} />

      {!isLoading && !error ? (
        <>
          <section className="stats-grid">
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Users</span><span className="stat-value">{stats.total}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Active</span><span className="stat-value">{stats.active}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Suspended</span><span className="stat-value">{stats.suspended}</span></div></div>
            <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Admins</span><span className="stat-value">{stats.admins}</span></div></div>
          </section>

          <section className="neu-card">
            <div className="neu-card-hd"><h3>Team Members</h3></div>
            <div className="tbl-wrap">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="cell-num">Actions</th>
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
                          <button type="button" className="neu-btn neu-btn--secondary neu-neu-btn--sm" onClick={() => openEdit(user)}>Edit</button>
                          <button type="button" className="neu-btn neu-btn--secondary neu-neu-btn--sm text-danger" onClick={() => setDeleteTarget(username)}>Delete</button>
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan="6">
                        <EmptyState title="No team members yet" hint="Add your team so they can sign in with their own role." />
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
          title={editingUsername ? 'Edit User' : 'Add User'}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="neu-btn neu-neu-btn--secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="userForm" className="neu-btn neu-neu-btn--primary" disabled={isSaving}>
                {editingUsername ? 'Save Changes' : 'Add User'}
              </button>
            </>
          }
        >
          <form id="userForm" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="userName">Full Name</label>
                <input id="userName" className="form-control" required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="userUsername">Username</label>
                <input id="userUsername" className="form-control" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} placeholder="auto-generated if blank" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="userEmail">Email</label>
                <input id="userEmail" className="form-control" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="userPassword">{editingUsername ? 'New Password' : 'Password'}</label>
                <input
                  id="userPassword"
                  className="form-control"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder={editingUsername ? 'leave blank to keep current' : 'required for sign in'}
                />
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
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Team Member"
        message={`This will revoke access for "${deleteTarget || 'this user'}". They will no longer be able to sign in.`}
        confirmLabel="Remove User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default UsersPage
