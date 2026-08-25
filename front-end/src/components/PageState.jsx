/** Shared loading / error panel. Renders nothing when idle. */
function PageState({ loading, error, label = 'Loading…', onRetry }) {
  if (loading) {
    return (
      <div className="loading-panel" role="status">
        <svg className="spinner" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
        </svg>
        <span>{label}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-panel" role="alert">
        <strong>{typeof error === 'string' ? error : 'Something went wrong.'}</strong>
        {onRetry ? (
          <button type="button" className="btn btn-outline btn-xs" onClick={onRetry}>
            Try Again
          </button>
        ) : null}
      </div>
    )
  }

  return null
}

export default PageState
