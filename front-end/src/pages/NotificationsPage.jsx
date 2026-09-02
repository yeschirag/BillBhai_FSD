import { useMemo } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import EmptyState from '../components/EmptyState.jsx'
import PageState from '../components/PageState.jsx'

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

  if (isLoading || error) {
    return (
      <>
        <div className="page-header">
          <h2>Notifications</h2>
        </div>
        <PageState loading={isLoading} error={error} label="Loading notifications…" />
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h2>Notifications</h2>
      </div>

      <section className="stats-grid">
        <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Total</span><span className="stat-value">{stats.total}</span></div></div>
        <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Unread</span><span className="stat-value">{stats.unread}</span></div></div>
        <div className="stat-neu-card"><div className="stat-info"><span className="stat-label">Actionable</span><span className="stat-value">{stats.action}</span></div></div>
      </section>

      <section className="neu-card">
        <div className="neu-card-hd"><h3>Inbox</h3></div>
        <div className="neu-card-bd workspace-notification-list">
          {filteredNotifications.length ? filteredNotifications.map((item) => {
            const canToggle = notifications.some((entry) => entry.id === item.id)
            return (
              <article key={item.id} className={`workspace-notification ${item.unread ? 'is-unread' : ''}`}>
                <div className="workspace-notification-copy">
                  <div className="workspace-notification-topline">
                    <h4>{item.title}</h4>
                    {item.priority === 'high' ? (
                      <span className="badge b-cancelled">High priority</span>
                    ) : null}
                    {item.unread ? <span className="badge b-processing">New</span> : null}
                  </div>
                  <p>{item.desc}</p>
                  <div className="workspace-meta-row">
                    <span>{item.time}</span>
                    <span>{item.category || item.type}</span>
                  </div>
                  {item.detailRows?.length ? (
                    <div className="workspace-detail-grid">
                      {item.detailRows.map((row) => (
                        <div key={`${item.id}-${row.label}`} className="workspace-detail-neu-card">
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {canToggle ? (
                  <button type="button" className="neu-btn neu-btn--secondary neu-neu-btn--sm" onClick={() => toggleRead(item.id, item.unread)}>
                    Mark {item.unread ? 'Read' : 'Unread'}
                  </button>
                ) : null}
              </article>
            )
          }) : (
            <EmptyState title="Inbox zero" hint="Notifications about orders, deliveries, and returns will appear here." />
          )}
        </div>
      </section>
    </>
  )
}

export default NotificationsPage
