const DEFAULT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
)

/** Empty-data placeholder used inside cards, tables, and lists. */
function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="empty-state">
      {icon || DEFAULT_ICON}
      {title ? <strong>{title}</strong> : null}
      {hint ? <p>{hint}</p> : null}
      {action || null}
    </div>
  )
}

export default EmptyState
