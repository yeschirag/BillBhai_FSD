import { useEffect, useMemo, useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import {
  updateStoredCurrentUser,
  upsertAuthOverride,
} from '../services/workspaceService.js'

function ProfilePage() {
  const { activeBusiness, currentUser, isLoading, error } = useWorkspaceData()
  const [name, setName] = useState(() => currentUser?.name || '')
  const [email, setEmail] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    setName(currentUser?.name || '')
  }, [currentUser?.name])

  const facts = useMemo(() => ([
    { label: 'Role', value: currentUser?.role || 'Unknown' },
    { label: 'Scoped Business', value: activeBusiness?.name || 'Global' },
    { label: 'Business ID', value: activeBusiness?.id || 'N/A' },
  ]), [activeBusiness?.id, activeBusiness?.name, currentUser?.role])

  const handleSave = (event) => {
    event.preventDefault()
    if (!currentUser?.username) return

    updateStoredCurrentUser({ name: String(name || '').trim() })
    upsertAuthOverride(currentUser.username, {
      name: String(name || '').trim(),
      email: String(email || '').trim(),
    })
    setStatusMessage('Profile settings saved locally for this frontend environment.')
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading profile...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <>
      <div className="page-header">
        <h2>Profile &amp; Settings</h2>
      </div>

      <section className="grid-2">
        <div className="card">
          <div className="card-hd"><h3>Account</h3></div>
          <div className="card-bd">
            <form onSubmit={handleSave} className="workspace-form-stack">
              <div className="form-group">
                <label className="form-label" htmlFor="profileName">Display Name</label>
                <input id="profileName" className="form-control" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profileEmail">Email</label>
                <input id="profileEmail" className="form-control" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Optional local override" />
              </div>
              <div className="workspace-inline-actions">
                <button type="submit" className="btn btn-primary">Save Settings</button>
                {statusMessage ? <span className="text-muted">{statusMessage}</span> : null}
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><h3>Workspace Context</h3></div>
          <div className="card-bd workspace-detail-grid">
            {facts.map((item) => (
              <div key={item.label} className="workspace-detail-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Security Notes</h3></div>
        <div className="card-bd">
          <p className="text-muted">
            Authentication in this migration phase remains JSON and local-storage backed. Password reset, MFA,
            and backend-issued sessions can be layered in later without replacing these page components.
          </p>
        </div>
      </section>
    </>
  )
}

export default ProfilePage
