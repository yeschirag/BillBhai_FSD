import { useMemo } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import { getStatusBadgeClass } from '../services/workspaceService.js'

function NotificationsPage() {
  const {
    activeBusinessId,
    notifications,
    sessionNotifications,
    currentUser,
    isLoading,
    error,
    mutateWorkspace,
  } = useWorkspaceData()

  const filteredNotifications = useMemo(() => {
    const persistent = notifications.filter((item) => !item.scopeBusinessId || item.scopeBusinessId === activeBusinessId)
    const sessionOnly = currentUser?.role === 'customer' ? sessionNotifications : []
    return [...sessionOnly, ...persistent]
  }, [activeBusinessId, currentUser?.role, notifications, sessionNotifications])

  const stats = useMemo(() => ({
    total: filteredNotifications.length,
    unread: filteredNotifications.filter((item) => item.unread).length,
    action: filteredNotifications.filter((item) => item.priority === 'high' || item.priority === 'medium').length,
  }), [filteredNotifications])

  const toggleRead = async (id, unread) => {
    await mutateWorkspace((draft) => {
      const target = draft.notifications.find((item) => item.id === id)
      if (target) target.unread = !unread
    })
  }

  if (isLoading) {
    return <section className="card"><div className="card-bd">Loading notifications...</div></section>
  }

  if (error) {
    return <section className="card"><div className="card-bd">{error}</div></section>
  }

  return (
    <>
      <div className="page-header">
        <h2>Notifications</h2>
      </div>

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Total</span><span className="stat-value">{stats.total}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Unread</span><span className="stat-value">{stats.unread}</span></div></div>
        <div className="stat-card"><div className="stat-info"><span className="stat-label">Actionable</span><span className="stat-value">{stats.action}</span></div></div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Inbox</h3></div>
        <div className="card-bd workspace-notification-list">
          {filteredNotifications.length ? filteredNotifications.map((item) => {
            const canToggle = notifications.some((entry) => entry.id === item.id)
            return (
              <article key={item.id} className={`workspace-notification ${item.unread ? 'is-unread' : ''}`}>
                <div className="workspace-notification-copy">
                  <div className="workspace-notification-topline">
                    <h4>{item.title}</h4>
                    <span className={`badge ${getStatusBadgeClass(item.priority || 'medium')}`}>{item.priority || 'medium'}</span>
                  </div>
                  <p>{item.desc}</p>
                  <div className="workspace-meta-row">
                    <span>{item.time}</span>
                    <span>{item.category || item.type}</span>
                  </div>
                  {item.detailRows?.length ? (
                    <div className="workspace-detail-grid">
                      {item.detailRows.map((row) => (
                        <div key={`${item.id}-${row.label}`} className="workspace-detail-card">
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {canToggle ? (
                  <button type="button" className="btn btn-outline btn-xs" onClick={() => toggleRead(item.id, item.unread)}>
                    Mark {item.unread ? 'Read' : 'Unread'}
                  </button>
                ) : null}
              </article>
            )
          }) : (
            <p className="text-muted">No notifications are available for this view.</p>
          )}
        </div>
      </section>
    </>
  )
}

export default NotificationsPage
